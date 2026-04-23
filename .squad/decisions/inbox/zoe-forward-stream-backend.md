# Decision: Forward Stream Backend Constants & Scopes

**Author:** Zoe (Backend / Nostr Dev)
**Date:** 2025-07-14
**Status:** Implemented

## Context
The forward stream feature had hardcoded RTMP URLs, wrong Facebook OAuth scopes, unsafe deep property access, and inconsistent error handling across 4 platform credential fetchers.

## Decisions

1. **Shared RTMP constants** at `src/lib/streaming/constants.ts` — single source of truth for `PLATFORM_RTMP_URLS`. Both backend (callback route) and frontend (ForwardStreamSettings) should import from here.

2. **Facebook OAuth scope changed** from `user_videos` → `publish_video`. The `user_videos` scope is read-only and cannot create live streams.

3. **Facebook API version** extracted to `FACEBOOK_API_VERSION` constant, configurable via `process.env.FACEBOOK_API_VERSION` (default `v20.0`).

4. **Error messages** across all platform fetchers are now actionable — they tell the user what to check or do, not just report failure.

## Impact
- Kaylee needs to import `PLATFORM_RTMP_URLS` from `@/lib/streaming/constants` in `ForwardStreamSettings.tsx` to replace hardcoded URLs.
- Any new streaming platform added should add its RTMP URL to `PLATFORM_RTMP_URLS`.
