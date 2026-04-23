# Feature Gaps & Incomplete Implementations

**Author:** Wash (Lead / Architect)
**Date:** 2025-07-18
**Scope:** Full codebase audit of `src/`

---

## 🔴 HIGH Priority

### H1. XSS Vulnerability in OAuth Callback Response
- **File:** `src/app/api/auth/[platform]/callback/route.ts:250-257`
- **Issue:** `postMessage(${message}, ...)` injects JSON directly into a `<script>` tag. If any credential value contains `</script>`, it breaks out of the script context. Must use proper JS escaping or a safer message-passing pattern.
- **Assign:** Zoe (Backend/Nostr)
- **Complexity:** Small

### H2. Empty `src/lib/nostr/` Directory — No Shared Nostr Utilities
- **File:** `src/lib/nostr/` (empty)
- **Issue:** Directory exists but is completely empty. Magic kind numbers (`1311`, `30311`, `30078`, `9735`) are scattered as literals across 6+ files with no shared constants. Relay lists are duplicated in two layouts.
- **Assign:** Zoe (Backend/Nostr)
- **Complexity:** Medium

### H3. Hardcoded RTMP Stream URL
- **File:** `src/component/StreamUrlBox.tsx:10`
- **Issue:** `"rtmp://beam.mapboss.co.th/live"` is hardcoded. Cannot be configured per deployment. Should be an env var `NEXT_PUBLIC_STREAM_URL`.
- **Assign:** Zoe (Backend/Nostr)
- **Complexity:** Small

### H4. Unsafe JSON.parse Without try/catch in PresetSettings
- **File:** `src/component/PresetSettings.tsx:42-44`
- **Issue:** `JSON.parse(info.data?.content || "{}")` inside `useMemo` — if content is corrupted or non-JSON, this throws and crashes the component. No error boundary.
- **Assign:** Kaylee (Frontend)
- **Complexity:** Small

### H5. Unhandled nip19.decode() Throws in Query Functions
- **Files:** `src/app/embed/live/[npub]/layout.tsx:46`, `src/app/(dashboard)/widgets/page.tsx:46`
- **Issue:** `nip19.decode(val).data.toString()` throws on invalid input. The queryFn has no try/catch, causing the entire query to fail silently with no user feedback.
- **Assign:** Zoe (Backend/Nostr)
- **Complexity:** Small

### H6. No Test Coverage Exists
- **Issue:** Zero tests in the entire project. No test framework configured.
- **Assign:** Jayne (Tester)
- **Complexity:** Large

### H7. `window.nostr` Type Definitions Are Untyped (`unknown`)
- **File:** `src/types.d.ts:7`
- **Issue:** `signEvent(event: unknown): Promise<unknown>` — both param and return use `unknown` instead of proper NIP-07 types. This defeats TypeScript safety for all extension signing.
- **Assign:** Zoe (Backend/Nostr)
- **Complexity:** Small

---

## 🟡 MEDIUM Priority

### M1. Duplicated Relay Configuration
- **Files:** `src/app/(dashboard)/layout.tsx:15-21`, `src/app/embed/live/[npub]/layout.tsx:10-16`
- **Issue:** Identical 5-relay array defined in two places. Should be a shared constant in `src/lib/nostr/relays.ts`.
- **Assign:** Zoe (Backend/Nostr)
- **Complexity:** Small

### M2. Missing Loading/Error States in Widget Previews
- **File:** `src/app/(dashboard)/widgets/page.tsx:123-216`
- **Issue:** No loading indicator while pubkey/liveInfo queries are pending. No error state if queries fail. User sees blank or stale content.
- **Assign:** Kaylee (Frontend)
- **Complexity:** Medium

### M3. Missing Loading/Error States in Embed Layout
- **File:** `src/app/embed/live/[npub]/layout.tsx:52-72`
- **Issue:** No `isLoading`/`error` checks on `liveInfo` query before rendering children. Widget may render with undefined context.
- **Assign:** Kaylee (Frontend)
- **Complexity:** Small

### M4. StreamKeyBox Has No Error Handling on Token Generation
- **File:** `src/component/StreamKeyBox.tsx:18-28`
- **Issue:** `getToken()` is awaited without try/catch. If it fails, `setBusy(false)` never runs and user sees permanent "Generating..." state.
- **Assign:** Kaylee (Frontend)
- **Complexity:** Small

### M5. PresetSettings.handleSubmit Has No Error Handling
- **File:** `src/component/PresetSettings.tsx:47-68`
- **Issue:** `await event.publish()` has no try/catch. If publish fails, busy state never clears and dialog never closes.
- **Assign:** Kaylee (Frontend)
- **Complexity:** Small

### M6. No Form Validation on EditStreamingInfo Fields
- **File:** `src/component/EditStreamingInfo.tsx:145-165`
- **Issue:** Title, Summary, and Cover Image TextFields have no `required`, `maxLength`, or pattern validation. Empty submissions are possible.
- **Assign:** Kaylee (Frontend)
- **Complexity:** Small

### M7. Comment-Code Mismatch: "Top 10" vs slice(0, 5)
- **File:** `src/app/embed/live/[npub]/top-zappers/page.tsx:61`
- **Issue:** `.slice(0, 5); // Get top 10` — comment says 10, code does 5.
- **Assign:** Kaylee (Frontend)
- **Complexity:** Small

### M8. Inconsistent Error Handling Across Platform Credential Fetchers
- **File:** `src/app/api/auth/[platform]/callback/route.ts`
- **Issue:** YouTube, Twitch, Facebook, TikTok handlers have different levels of validation. YouTube has deep property access without null checks (`stream.cdn.ingestionInfo.streamName`). Facebook has less validation than Twitch.
- **Assign:** Zoe (Backend/Nostr)
- **Complexity:** Medium

### M9. Hardcoded Facebook API Version
- **File:** `src/app/api/auth/[platform]/callback/route.ts:29,152`
- **Issue:** `v20.0` hardcoded in Facebook Graph API URLs. Will break when deprecated.
- **Assign:** Zoe (Backend/Nostr)
- **Complexity:** Small

### M10. Hardcoded localhost:3080 Fallback in OAuth Routes
- **Files:** `src/app/api/auth/[platform]/route.ts:73`, `src/app/api/auth/[platform]/callback/route.ts:300`
- **Issue:** `appUrl ?? 'http://localhost:3080'` used in two places. Production deployments that forget the env var will break OAuth redirects.
- **Assign:** Zoe (Backend/Nostr)
- **Complexity:** Small

### M11. Clipboard Copy Has No User Feedback or Fallback
- **Files:** `src/component/StreamKeyBox.tsx:59-70`, `src/component/StreamUrlBox.tsx:35-46`, `src/component/ForwardStreamSettings.tsx:340-343`
- **Issue:** Copy-to-clipboard silently fails without user feedback. No toast/snackbar on success or failure. Fallback for insecure contexts is commented out.
- **Assign:** Kaylee (Frontend)
- **Complexity:** Small

### M12. ForwardStreamSettings Silent Decrypt Fallback
- **File:** `src/component/ForwardStreamSettings.tsx:262-272`
- **Issue:** If decryption fails, falls back to default config silently. User may not realize their saved config wasn't loaded.
- **Assign:** Kaylee (Frontend)
- **Complexity:** Small

### M13. Hardcoded Platform RTMP Server URLs
- **File:** `src/component/ForwardStreamSettings.tsx:60-81`
- **Issue:** YouTube (`rtmp://a.rtmp.youtube.com/live2/`) and Facebook (`rtmps://live-api-s.facebook.com:443/rtmp/`) server URLs are hardcoded. These could change.
- **Assign:** Zoe (Backend/Nostr)
- **Complexity:** Small

### M14. Custom Hooks Return No Loading/Error State
- **File:** `src/hook/nostr-event.ts:5-31`
- **Issue:** `useEventId` and `useEvents` only return `events?.[0]`. Consumers have no way to distinguish "loading" from "no data." Should return `{ event, isLoading, error }`.
- **Assign:** Zoe (Backend/Nostr)
- **Complexity:** Medium

---

## 🟢 LOW Priority

### L1. Missing Accessibility: Fallback Avatars Lack aria-label
- **Files:** `src/component/ChatMessage.tsx:116`, `src/component/ReplyMessage.tsx:83`, `src/component/TopZapperItem.tsx:50`, `src/component/ProfileMenuButton.tsx:47`
- **Issue:** When Avatar falls back to a letter initial, there's no `aria-label` for screen readers.
- **Assign:** Kaylee (Frontend)
- **Complexity:** Small

### L2. Missing Accessibility: LiveChatWidget Needs role="log"
- **File:** `src/component/LiveChatWidget.tsx:89`
- **Issue:** Chat container should have `role="log"` and `aria-label="Live chat messages"` for assistive technology.
- **Assign:** Kaylee (Frontend)
- **Complexity:** Small

### L3. Missing Accessibility: LoginScreen Has No Visible Label for Private Key Field
- **File:** `src/component/LoginScreen.tsx:214`
- **Issue:** TextField uses `placeholder` only — disappears when typing. Should have a proper label.
- **Assign:** Kaylee (Frontend)
- **Complexity:** Small

### L4. Missing Accessibility: TagsBox Chip Delete Lacks Label
- **File:** `src/component/TagsBox.tsx:30`
- **Issue:** Chip delete button has no `aria-label` like "Remove tag: {name}".
- **Assign:** Kaylee (Frontend)
- **Complexity:** Small

### L5. Missing Accessibility: Decorative Icons Missing aria-hidden
- **Files:** `src/component/LoginScreen.tsx:104` (Videocam icon), `src/component/ViewersWidget.tsx:62` (LogoNostr)
- **Issue:** Decorative icons should have `aria-hidden="true"`.
- **Assign:** Kaylee (Frontend)
- **Complexity:** Small

### L6. Hardcoded Colors in ChatMessage
- **File:** `src/component/ChatMessage.tsx:172-182`
- **Issue:** Colors like `#aaffaa`, `#ffffff`, `#bdbdbd` are hardcoded instead of using theme tokens.
- **Assign:** Kaylee (Frontend)
- **Complexity:** Small

### L7. Thai-Only Console Error Messages
- **File:** `src/component/TextNote.tsx:39-81`
- **Issue:** Error log uses Thai: `"🚫 เกิดข้อผิดพลาดในการถอดรหัส NIP-21 URI:"`. Console messages should be in English for international contributors.
- **Assign:** Kaylee (Frontend)
- **Complexity:** Small

### L8. TagsBox Has No Duplicate Tag Feedback
- **File:** `src/component/TagsBox.tsx:44-53`
- **Issue:** Silently ignores duplicate tags. Should show brief feedback to user.
- **Assign:** Kaylee (Frontend)
- **Complexity:** Small

### L9. Font Weights and Subsets Hardcoded in Theme
- **File:** `src/lib/mui/theme.ts:6-9`
- **Issue:** `weight: ["300", "400", "500", "700"]` and `subsets: ["latin", "thai"]` are hardcoded. Minor — but could be constants.
- **Assign:** Kaylee (Frontend)
- **Complexity:** Small

---

## Summary

| Priority | Count | Key Themes |
|----------|-------|------------|
| 🔴 HIGH | 7 | Security (XSS), missing shared infra (`lib/nostr`), no tests, unsafe parsing |
| 🟡 MEDIUM | 14 | Missing error/loading states, hardcoded config, inconsistent patterns |
| 🟢 LOW | 9 | Accessibility, theme tokens, UX polish |
| **Total** | **30** | |

### Agent Workload Breakdown

| Agent | HIGH | MEDIUM | LOW | Total |
|-------|------|--------|-----|-------|
| **Zoe** (Backend/Nostr) | 4 | 5 | 0 | 9 |
| **Kaylee** (Frontend) | 1 | 6 | 9 | 16 |
| **Jayne** (Tester) | 1 | 0 | 0 | 1 |

### Recommended Execution Order
1. **H1** (XSS fix) — security, ship immediately
2. **H2** (shared nostr constants + relays) — unblocks M1
3. **H3** (RTMP URL → env var) — deployment blocker
4. **H4, H5** (unsafe parsing) — crash bugs
5. **H6** (test framework) — Jayne sets up foundation
6. **M2-M5** (loading/error states) — UX quality
7. Everything else in priority order
