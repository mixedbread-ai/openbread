---
"@mixedbread/cli": patch
---

Improved CLI I/O, concurrency, and code deduplication

- Routed log and spinner output to stderr to keep stdout clean for piped data
- Replaced internal `mergeCommandOptions` with Commander's built-in `optsWithGlobals()`
- Switched to sliding-window concurrency (`p-limit`) for file uploads
- Used async file I/O in upload and sync hot paths
- Extracted shared `checkExistingFiles` utility
- Fixed missing `process.exit(1)` in completion command error handlers
- Fixed spinners not being stopped in catch blocks for sync and upload commands
