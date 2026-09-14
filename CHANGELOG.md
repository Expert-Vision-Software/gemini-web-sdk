# Changelog

## [2.3.0] - 2026-09-13

### Added
- `maxResponseHeaderSize` option (default `65536`) on the `Gemini` constructor, honored by every outbound request (init, google.com pre-flight, batchexecute, generate, upload)
  - Node/Bun parse responses with llhttp, which aborts with `HPE_HEADER_OVERFLOW` when a response header block exceeds 16384 bytes; large `Set-Cookie` floods from `gemini.google.com` (common behind proxies) made every SDK call fail before application code saw a response
  - Implemented via a per-request `maxHeaderSize` on the underlying `http(s)` transport (axios `transport` override wrapping `follow-redirects`); proxy, redirect, timeout, and streaming behavior are unchanged
- Media downloads (`Image#save`, `GeneratedImage#save`, `Video#save`, `GeneratedVideo#save`, `GeneratedMedia#save`) honor the client's `maxResponseHeaderSize` when a `client_ref` is attached
- `endpoints` option to override the hardcoded Google endpoints per client instance (mainly for testing against local fixtures)
- Regression suite `test/max-response-headers.test.js`: raw-socket fixture serving a 20KB `Set-Cookie` header block proves init and `_batchExecute` POSTs succeed (red before the fix), an explicit `maxResponseHeaderSize: 16384` still rejects oversized headers, and the `AuthError('Cookies invalid.')` classification is unchanged
- `npm test` now runs both test files

## [2.2.0] - 2026-07-29

### Added
- `readChat()` now returns `rid` and `rcid` on each turn object (non-breaking, additive)
  - Model turns include both `rid` and `rcid`
  - User turns include `rid` only
- `continueChat(cid)` convenience method that fetches latest rid/rcid and returns a ready-to-use `ChatSession`
- TypeScript declarations updated in `index.d.ts`
- Unit tests for `rid`/`rcid` presence in `readChat` and `_readChatInternal`

### Fixed
- `_readChatInternal()` now passes actual `rid` into `ModelOutput` metadata instead of empty string
- Parser index fallback chain: replaced strict `body[0]` turns lookup with `[0] ?? [1] ?? [2] ?? [3] ?? [4]` fallback so parser survives whichever index carries turns on the live server
- `readChat` silently returning `[]` for chats that exist in `chats()` — the positional parser was walking past every response part
- `GEMINI_REVERSE_DEBUG`-gated diagnostic logging added to `readChat` and `_readChatInternal` for future regression diagnosis
