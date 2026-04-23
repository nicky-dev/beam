# Decision: Phase 1+2 Frontend Implementation

**Date:** 2025-07-18
**Author:** Kaylee (Frontend Dev)
**Status:** IMPLEMENTED

## What Changed

### Phase 1: OAuth Mandatory + Token Persistence
- Removed all manual setup UI (`manualSetup`, `manualFields`, `handleManualSave`, Manual Setup button, manual TextFields)
- Expanded `PlatformConfig` with `accessToken`, `refreshToken?`, `tokenExpiresAt?`, `broadcastId?`
- Updated `handleOAuthSuccess` to extract and store `accessToken` + `refreshToken` from postMessage
- Updated `handleDisconnect` to clear all token/broadcast fields
- "Not connected" state now shows only: Alert + OAuth Connect button
- Facebook/TikTok show "Connected — credentials will be created when you start forwarding" when they have accessToken but no streamKey

### Phase 2: Broadcast Creation Flow
- Added `presetQuery` (kind:30078, d-tag: `beamlivestudio-config`) to fetch title/description
- `handleStartForward` now: (1) calls `POST /api/stream/{platform}/broadcast`, (2) updates config with broadcastId + any new credentials, (3) calls push API
- `handleStopForward` clears `broadcastId` on stop and saves config
- `handleStartAllForward` now checks `accessToken` instead of `streamKey` for eligibility
- Added `broadcastCreating` state with loading spinner on the Start Forward button
- Removed now-unused `callStartPushApi` helper

## Dependencies on Zoe
- Broadcast API route (`/api/stream/[platform]/broadcast`) must exist and return `{ broadcastId, streamKey?, serverUrl? }`
- OAuth callbacks must include `accessToken` and `refreshToken` in postMessage payload
- Facebook/TikTok OAuth callbacks should return `streamKey: ""` (defer credential creation)

## File Changed
- `src/component/ForwardStreamSettings.tsx` — 1054 lines (was 1043)
