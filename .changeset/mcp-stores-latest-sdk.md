---
"@mixedbread/mcp": major
---

Move to the Stores API on `@mixedbread/sdk` 0.78. Tools are renamed from `vector_store_*` to `store_*` and take `store_identifier(s)`; `store_list` paginates with `after`; `vector_store_file_search` is removed. The server no longer calls the deprecated `/v1/vector_stores` endpoints.
