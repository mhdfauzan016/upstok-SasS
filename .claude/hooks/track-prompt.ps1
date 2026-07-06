$payload = [System.Console]::In.ReadToEnd() | ConvertFrom-Json

$session_id      = $payload.session_id
$transcript_path = $payload.transcript_path

$project_dir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$state_path  = Join-Path $project_dir ".claude\token-state.json"

$baseline_input       = 0
$baseline_cache_write = 0
$baseline_cache_read  = 0
$baseline_output      = 0
$baseline_thinking    = 0
$baseline_by_model    = @{}

if (Test-Path $transcript_path) {
    foreach ($line in (Get-Content $transcript_path -Encoding UTF8)) {
        try {
            $entry = $line | ConvertFrom-Json
            if ($entry.message.usage) {
                $u = $entry.message.usage
                $baseline_input       += [int]$u.input_tokens
                $baseline_cache_write += [int]$u.cache_creation_input_tokens
                $baseline_cache_read  += [int]$u.cache_read_input_tokens
                $baseline_output      += [int]$u.output_tokens
                $baseline_thinking    += [int]$u.thinking_input_tokens

                $model = [string]$entry.message.model
                if ($model -ne "") {
                    if (-not $baseline_by_model.ContainsKey($model)) {
                        $baseline_by_model[$model] = @{
                            input       = 0
                            cache_write = 0
                            cache_read  = 0
                            output      = 0
                            thinking    = 0
                        }
                    }
                    $baseline_by_model[$model].input       += [int]$u.input_tokens
                    $baseline_by_model[$model].cache_write += [int]$u.cache_creation_input_tokens
                    $baseline_by_model[$model].cache_read  += [int]$u.cache_read_input_tokens
                    $baseline_by_model[$model].output      += [int]$u.output_tokens
                    $baseline_by_model[$model].thinking    += [int]$u.thinking_input_tokens
                }
            }
        } catch {}
    }
}

@{
    session_id           = $session_id
    baseline_input       = $baseline_input
    baseline_cache_write = $baseline_cache_write
    baseline_cache_read  = $baseline_cache_read
    baseline_output      = $baseline_output
    baseline_thinking    = $baseline_thinking
    baseline_by_model    = $baseline_by_model
} | ConvertTo-Json -Depth 5 | Set-Content -Path $state_path -Encoding UTF8
