$payload = [System.Console]::In.ReadToEnd() | ConvertFrom-Json

$session_id      = $payload.session_id
$transcript_path = $payload.transcript_path

$project_dir  = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$data_path    = Join-Path $project_dir ".claude\token-data.json"
$state_path   = Join-Path $project_dir ".claude\token-state.json"
$scope_path   = Join-Path $project_dir ".claude\current-scope.txt"
$summary_path = Join-Path $project_dir ".claude\token-summary.md"

# Read current transcript totals, split by type and model
$total_input       = 0
$total_cache_write = 0
$total_cache_read  = 0
$total_output      = 0
$total_thinking    = 0
$totals_by_model   = @{}

if (Test-Path $transcript_path) {
    foreach ($line in (Get-Content $transcript_path -Encoding UTF8)) {
        try {
            $entry = $line | ConvertFrom-Json
            if ($entry.message.usage) {
                $u = $entry.message.usage
                $total_input       += [int]$u.input_tokens
                $total_cache_write += [int]$u.cache_creation_input_tokens
                $total_cache_read  += [int]$u.cache_read_input_tokens
                $total_output      += [int]$u.output_tokens
                $total_thinking    += [int]$u.thinking_input_tokens

                $model = [string]$entry.message.model
                if ($model -ne "") {
                    if (-not $totals_by_model.ContainsKey($model)) {
                        $totals_by_model[$model] = @{ input=0; cache_write=0; cache_read=0; output=0; thinking=0 }
                    }
                    $totals_by_model[$model].input       += [int]$u.input_tokens
                    $totals_by_model[$model].cache_write += [int]$u.cache_creation_input_tokens
                    $totals_by_model[$model].cache_read  += [int]$u.cache_read_input_tokens
                    $totals_by_model[$model].output      += [int]$u.output_tokens
                    $totals_by_model[$model].thinking    += [int]$u.thinking_input_tokens
                }
            }
        } catch {}
    }
}

# Calculate delta from baseline — initialize as full totals, then subtract baseline
$delta_input       = $total_input
$delta_cache_write = $total_cache_write
$delta_cache_read  = $total_cache_read
$delta_output      = $total_output
$delta_thinking    = $total_thinking
$delta_by_model    = @{}

foreach ($model in $totals_by_model.Keys) {
    $t = $totals_by_model[$model]
    $delta_by_model[$model] = @{ input=$t.input; cache_write=$t.cache_write; cache_read=$t.cache_read; output=$t.output; thinking=$t.thinking }
}

if (Test-Path $state_path) {
    $state = Get-Content $state_path -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($state.session_id -eq $session_id) {
        if ($null -ne $state.baseline_cache_write) {
            # Current format
            $delta_input       = $total_input       - [int]$state.baseline_input
            $delta_cache_write = $total_cache_write - [int]$state.baseline_cache_write
            $delta_cache_read  = $total_cache_read  - [int]$state.baseline_cache_read
            $delta_output      = $total_output      - [int]$state.baseline_output
            $delta_thinking    = $total_thinking    - [int]$state.baseline_thinking

            if ($state.baseline_by_model) {
                $baseline_models = @{}
                $state.baseline_by_model.PSObject.Properties | ForEach-Object {
                    $baseline_models[$_.Name] = $_.Value
                }

                foreach ($model in $totals_by_model.Keys) {
                    $b_input = 0; $b_cw = 0; $b_cr = 0; $b_out = 0; $b_think = 0
                    if ($baseline_models.ContainsKey($model)) {
                        $bm = $baseline_models[$model]
                        $b_input  = [int]$bm.input
                        $b_cw     = [int]$bm.cache_write
                        $b_cr     = [int]$bm.cache_read
                        $b_out    = [int]$bm.output
                        $b_think  = [int]$bm.thinking
                    }
                    $delta_by_model[$model] = @{
                        input       = $totals_by_model[$model].input       - $b_input
                        cache_write = $totals_by_model[$model].cache_write - $b_cw
                        cache_read  = $totals_by_model[$model].cache_read  - $b_cr
                        output      = $totals_by_model[$model].output      - $b_out
                        thinking    = $totals_by_model[$model].thinking    - $b_think
                    }
                }
            }
        } elseif ($null -ne $state.baseline_cache) {
            # Previous format
            $delta_input       = $total_input       - [int]$state.baseline_input
            $delta_cache_write = 0
            $delta_cache_read  = $total_cache_write + $total_cache_read - [int]$state.baseline_cache
            $delta_output      = $total_output      - [int]$state.baseline_output
            $delta_thinking    = $total_thinking
        } else {
            # Legacy format
            $combined_current  = $total_input + $total_cache_write + $total_cache_read
            $combined_delta    = $combined_current - [int]$state.baseline_input
            $delta_input       = [math]::Max(0, $combined_delta)
            $delta_cache_write = 0
            $delta_cache_read  = 0
            $delta_output      = $total_output - [int]$state.baseline_output
            $delta_thinking    = $total_thinking
        }
    }
}

if (($delta_input + $delta_cache_write + $delta_cache_read + $delta_output + $delta_thinking) -le 0) { exit 0 }

# Load existing data or initialize
$overall_input       = 0
$overall_cache_write = 0
$overall_cache_read  = 0
$overall_output      = 0
$overall_thinking    = 0
$overall_by_model    = @{}
$scopes_list         = @()

if (Test-Path $data_path) {
    try {
        $raw = Get-Content $data_path -Raw -Encoding UTF8 | ConvertFrom-Json
        $overall_input       = [int]$raw.overall.input
        $overall_cache_write = [int]$raw.overall.cache_write
        $overall_cache_read  = [int]$raw.overall.cache_read
        $overall_output      = [int]$raw.overall.output
        $overall_thinking    = [int]$raw.overall.thinking

        if ($raw.overall.by_model) {
            $raw.overall.by_model.PSObject.Properties | ForEach-Object {
                $overall_by_model[$_.Name] = @{
                    input       = [int]$_.Value.input
                    cache_write = [int]$_.Value.cache_write
                    cache_read  = [int]$_.Value.cache_read
                    output      = [int]$_.Value.output
                    thinking    = [int]$_.Value.thinking
                }
            }
        }

        if ($raw.scopes) {
            foreach ($s in @($raw.scopes)) {
                $scope_by_model = @{}
                if ($s.by_model) {
                    $s.by_model.PSObject.Properties | ForEach-Object {
                        $scope_by_model[$_.Name] = @{
                            input       = [int]$_.Value.input
                            cache_write = [int]$_.Value.cache_write
                            cache_read  = [int]$_.Value.cache_read
                            output      = [int]$_.Value.output
                            thinking    = [int]$_.Value.thinking
                        }
                    }
                }
                $scopes_list += @{
                    name        = [string]$s.name
                    input       = [int]$s.input
                    cache_write = [int]$s.cache_write
                    cache_read  = [int]$s.cache_read
                    output      = [int]$s.output
                    thinking    = [int]$s.thinking
                    updated     = [string]$s.updated
                    by_model    = $scope_by_model
                }
            }
        }
    } catch {}
}

# Update overall totals
$overall_input       += $delta_input
$overall_cache_write += $delta_cache_write
$overall_cache_read  += $delta_cache_read
$overall_output      += $delta_output
$overall_thinking    += $delta_thinking

foreach ($model in $delta_by_model.Keys) {
    $d = $delta_by_model[$model]
    if (($d.input + $d.cache_write + $d.cache_read + $d.output + $d.thinking) -le 0) { continue }
    if (-not $overall_by_model.ContainsKey($model)) {
        $overall_by_model[$model] = @{ input=0; cache_write=0; cache_read=0; output=0; thinking=0 }
    }
    $overall_by_model[$model].input       += $d.input
    $overall_by_model[$model].cache_write += $d.cache_write
    $overall_by_model[$model].cache_read  += $d.cache_read
    $overall_by_model[$model].output      += $d.output
    $overall_by_model[$model].thinking    += $d.thinking
}

# Read active scope
$active_scope = ""
if (Test-Path $scope_path) {
    $active_scope = (Get-Content $scope_path -Raw -Encoding UTF8).Trim()
}

$today = Get-Date -Format "yyyy-MM-dd"

# Update scope if active
if ($active_scope -ne "") {
    $found_scope = $null
    foreach ($s in $scopes_list) {
        if ($s.name -eq $active_scope) { $found_scope = $s; break }
    }

    if ($found_scope) {
        $found_scope.input       += $delta_input
        $found_scope.cache_write += $delta_cache_write
        $found_scope.cache_read  += $delta_cache_read
        $found_scope.output      += $delta_output
        $found_scope.thinking    += $delta_thinking
        $found_scope.updated      = $today

        foreach ($model in $delta_by_model.Keys) {
            $d = $delta_by_model[$model]
            if (($d.input + $d.cache_write + $d.cache_read + $d.output + $d.thinking) -le 0) { continue }
            if (-not $found_scope.by_model.ContainsKey($model)) {
                $found_scope.by_model[$model] = @{ input=0; cache_write=0; cache_read=0; output=0; thinking=0 }
            }
            $found_scope.by_model[$model].input       += $d.input
            $found_scope.by_model[$model].cache_write += $d.cache_write
            $found_scope.by_model[$model].cache_read  += $d.cache_read
            $found_scope.by_model[$model].output      += $d.output
            $found_scope.by_model[$model].thinking    += $d.thinking
        }
    } else {
        $new_scope_by_model = @{}
        foreach ($model in $delta_by_model.Keys) {
            $d = $delta_by_model[$model]
            if (($d.input + $d.cache_write + $d.cache_read + $d.output + $d.thinking) -le 0) { continue }
            $new_scope_by_model[$model] = @{
                input       = $d.input
                cache_write = $d.cache_write
                cache_read  = $d.cache_read
                output      = $d.output
                thinking    = $d.thinking
            }
        }
        $scopes_list += @{
            name        = $active_scope
            input       = $delta_input
            cache_write = $delta_cache_write
            cache_read  = $delta_cache_read
            output      = $delta_output
            thinking    = $delta_thinking
            updated     = $today
            by_model    = $new_scope_by_model
        }
    }
}

# Save token-data.json
@{
    overall = @{
        input       = $overall_input
        cache_write = $overall_cache_write
        cache_read  = $overall_cache_read
        output      = $overall_output
        thinking    = $overall_thinking
        by_model    = $overall_by_model
    }
    scopes = @($scopes_list)
} | ConvertTo-Json -Depth 10 | Set-Content -Path $data_path -Encoding UTF8

# Format number with thousand separators
function Format-Number($n) { return "{0:N0}" -f [int]$n }

# Regenerate token-summary.md
$now   = Get-Date -Format "yyyy-MM-dd HH:mm"
$lines = [System.Collections.Generic.List[string]]::new()

$lines.Add("# Token Summary")
$lines.Add("")
$lines.Add("_Last updated: ${now}_")
$lines.Add("")
$lines.Add("## Legend")
$lines.Add("")
$lines.Add("| Field | API Field | Keterangan |")
$lines.Add("|-------|-----------|------------|")
$lines.Add("| **Input** | ``input_tokens`` | Token fresh yang diproses Claude, tidak ada di cache |")
$lines.Add("| **Cache Write** | ``cache_creation_input_tokens`` | Token yang baru pertama kali di-cache pada turn ini |")
$lines.Add("| **Cache Read** | ``cache_read_input_tokens`` | Token yang dibaca dari cache (jauh lebih murah dari Input) |")
$lines.Add("| **Output** | ``output_tokens`` | Token yang di-generate Claude sebagai respons |")
$lines.Add("| **Thinking** | ``thinking_input_tokens`` | Token untuk extended thinking/reasoning |")
$lines.Add("")
$lines.Add("---")
$lines.Add("")

if ($active_scope -ne "") {
    $lines.Add("> **Active scope:** ``$active_scope``")
    $lines.Add("")
}

# Table 1: By Model summary
$lines.Add("## By Model")
$lines.Add("")
$lines.Add("| Model | Input | Cache Write | Cache Read | Output | Thinking |")
$lines.Add("|-------|-------|-------------|------------|--------|----------|")
foreach ($model in ($overall_by_model.Keys | Sort-Object)) {
    $m = $overall_by_model[$model]
    $lines.Add("| ``$model`` | $(Format-Number $m.input) | $(Format-Number $m.cache_write) | $(Format-Number $m.cache_read) | $(Format-Number $m.output) | $(Format-Number $m.thinking) |")
}
$lines.Add("")
$lines.Add("---")
$lines.Add("")

# Tables 2 & 3: per-model group (Overall + By Scope)
foreach ($model in ($overall_by_model.Keys | Sort-Object)) {
    $m = $overall_by_model[$model]

    $lines.Add("## ``$model``")
    $lines.Add("")
    $lines.Add("### Overall")
    $lines.Add("")
    $lines.Add("| Input | Cache Write | Cache Read | Output | Thinking |")
    $lines.Add("|-------|-------------|------------|--------|----------|")
    $lines.Add("| $(Format-Number $m.input) | $(Format-Number $m.cache_write) | $(Format-Number $m.cache_read) | $(Format-Number $m.output) | $(Format-Number $m.thinking) |")
    $lines.Add("")

    $model_scopes = @()
    foreach ($s in $scopes_list) {
        if ($s.by_model.ContainsKey($model)) {
            $model_scopes += $s
        }
    }

    if ($model_scopes.Count -gt 0) {
        $lines.Add("### By Scope")
        $lines.Add("")
        $lines.Add("| Scope | Input | Cache Write | Cache Read | Output | Thinking | Last Updated |")
        $lines.Add("|-------|-------|-------------|------------|--------|----------|--------------|")
        foreach ($s in $model_scopes) {
            $sm = $s.by_model[$model]
            $lines.Add("| $($s.name) | $(Format-Number $sm.input) | $(Format-Number $sm.cache_write) | $(Format-Number $sm.cache_read) | $(Format-Number $sm.output) | $(Format-Number $sm.thinking) | $($s.updated) |")
        }
        $lines.Add("")
    }

    $lines.Add("---")
    $lines.Add("")
}

($lines -join "`n") | Set-Content -Path $summary_path -Encoding UTF8
