# Changelog

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
