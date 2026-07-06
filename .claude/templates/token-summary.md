# Token Summary

_Last updated: -_

## Legend

| Field | API Field | Keterangan |
|-------|-----------|------------|
| **Input** | `input_tokens` | Token fresh yang diproses Claude, tidak ada di cache |
| **Cache Write** | `cache_creation_input_tokens` | Token yang baru pertama kali di-cache pada turn ini |
| **Cache Read** | `cache_read_input_tokens` | Token yang dibaca dari cache (jauh lebih murah dari Input) |
| **Output** | `output_tokens` | Token yang di-generate Claude sebagai respons |
| **Thinking** | `thinking_input_tokens` | Token untuk extended thinking/reasoning |

---

## By Model

| Model | Input | Cache Write | Cache Read | Output | Thinking |
|-------|-------|-------------|------------|--------|----------|

---
