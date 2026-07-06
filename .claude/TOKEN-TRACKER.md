# Token Tracker

Sistem ini mencatat penggunaan token Claude secara otomatis setiap kali prompt dikirim dan setiap kali Claude selesai merespons. Data disimpan secara kumulatif dan bisa dikelompokkan per **scope** (fitur/task).

---

## Cara Kerja

Dua hook PowerShell dipasang di `settings.json`:

| Hook Event | Script | Fungsi |
|------------|--------|--------|
| `UserPromptSubmit` | `track-prompt.ps1` | Membaca transcript saat ini dan menyimpan **baseline** token (snapshot sebelum turn baru dimulai) |
| `Stop` | `track-tokens.ps1` | Setelah Claude selesai, hitung **delta** (total sekarang − baseline), lalu akumulasi ke `token-data.json` dan regenerasi `token-summary.md` |

Mekanisme baseline-delta ini memastikan token yang sudah dihitung di turn sebelumnya tidak dihitung dua kali.

---

## File-file

```
.claude/
├── hooks/
│   ├── track-prompt.ps1      # Hook UserPromptSubmit — simpan baseline
│   └── track-tokens.ps1      # Hook Stop — hitung delta & update data
├── templates/
│   ├── token-data.json       # Template reset untuk token-data.json
│   ├── token-state.json      # Template reset untuk token-state.json
│   └── token-summary.md      # Template reset untuk token-summary.md
├── token-data.json           # Data kumulatif semua token (overall + per scope)
├── token-state.json          # Baseline snapshot per session
├── token-summary.md          # Laporan markdown yang di-regenerasi otomatis
├── current-scope.txt         # Scope aktif saat ini (kosong = tidak ada scope)
└── settings.json             # Konfigurasi hooks Claude Code
```

---

## Field Token

| Field | API Field | Keterangan |
|-------|-----------|------------|
| **Input** | `input_tokens` | Token fresh yang diproses Claude, tidak ada di cache |
| **Cache Write** | `cache_creation_input_tokens` | Token yang baru pertama kali di-cache pada turn ini |
| **Cache Read** | `cache_read_input_tokens` | Token yang dibaca dari cache (jauh lebih murah dari Input) |
| **Output** | `output_tokens` | Token yang di-generate Claude sebagai respons |
| **Thinking** | `thinking_input_tokens` | Token untuk extended thinking/reasoning |

---

## Scope

Scope adalah label untuk mengelompokkan penggunaan token per fitur atau task. Token akan diakumulasi ke scope yang sedang aktif.

### Mengaktifkan scope
Tulis nama scope ke `current-scope.txt`:
```powershell
"nama-scope" | Set-Content .claude\current-scope.txt -Encoding UTF8
```
Atau minta Claude:
> "set scope ke `payment-refactor`"

### Menonaktifkan scope (kembali ke mode tanpa scope)
```powershell
"" | Set-Content .claude\current-scope.txt -Encoding UTF8
```

### Membuat scope baru
Cukup aktifkan scope dengan nama baru — scope dibuat otomatis saat pertama kali ada token yang masuk.

---

## Melihat Laporan

Buka file `token-summary.md` — file ini di-regenerasi otomatis setiap kali Claude selesai merespons. Isinya:

- **By Model** — ringkasan total per model
- **Per model** — breakdown overall + per scope

---

## Reset Token Tracker

Reset mengosongkan semua data akumulasi kembali ke nol, menggunakan file template yang ada di `.claude/templates/`.

### Langkah reset

**1. Overwrite `token-data.json`**
```powershell
Copy-Item .claude\templates\token-data.json .claude\token-data.json -Force
```

**2. Overwrite `token-state.json`**
```powershell
Copy-Item .claude\templates\token-state.json .claude\token-state.json -Force
```

**3. Overwrite `token-summary.md`**
```powershell
Copy-Item .claude\templates\token-summary.md .claude\token-summary.md -Force
```

**4. Kosongkan `current-scope.txt`**
```powershell
"" | Set-Content .claude\current-scope.txt -Encoding UTF8
```

### Satu perintah (jalankan semua sekaligus)
```powershell
Copy-Item .claude\templates\token-data.json .claude\token-data.json -Force; `
Copy-Item .claude\templates\token-state.json .claude\token-state.json -Force; `
Copy-Item .claude\templates\token-summary.md .claude\token-summary.md -Force; `
"" | Set-Content .claude\current-scope.txt -Encoding UTF8
```

> Setelah reset, data mulai akumulasi dari nol lagi pada turn berikutnya. Session yang sedang berjalan tidak terpengaruh sampai turn baru dimulai.

---

## Format `token-data.json`

```json
{
  "overall": {
    "input": 12345,
    "cache_write": 6789,
    "cache_read": 99000,
    "output": 4321,
    "thinking": 0,
    "by_model": {
      "claude-sonnet-4-6": { "input": 12345, "cache_write": 6789, ... }
    }
  },
  "scopes": [
    {
      "name": "payment-refactor",
      "input": 3000,
      "cache_write": 1000,
      "cache_read": 20000,
      "output": 1200,
      "thinking": 0,
      "updated": "2026-06-11",
      "by_model": { ... }
    }
  ]
}
```

## Format `token-state.json`

```json
{
  "session_id": "718748c8-...",
  "baseline_input": 50000,
  "baseline_cache_write": 10000,
  "baseline_cache_read": 200000,
  "baseline_output": 15000,
  "baseline_thinking": 0,
  "baseline_by_model": { ... }
}
```

Baseline diperbarui setiap kali prompt baru dikirim (hook `UserPromptSubmit`). `session_id` digunakan untuk memastikan baseline tidak dicampur antar session yang berbeda.
