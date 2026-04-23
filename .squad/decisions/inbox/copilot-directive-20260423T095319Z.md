### 2026-04-23T09:53:19Z: User directives — Forward Stream Architecture
**By:** nickydev (via Copilot)
**What:**
1. OAuth connection is MANDATORY for all platforms — remove manual stream key entry. OAuth links to both stream forwarding AND chat retrieval for widgets.
2. After OAuth connect, RTMP server URL and stream key are auto-populated (already works this way).
3. After pressing "Start Forward", the system must: (a) call the push stream API (OvenMediaEngine wrapper) AND (b) create/share a live broadcast on the provider using title + description from Preset Settings.
4. Chat widget must support multi-provider chat display — YouTube, Twitch, Facebook, TikTok live chat alongside Nostr chat.
**Why:** User request — foundational architecture decision for multistream + multi-provider chat
