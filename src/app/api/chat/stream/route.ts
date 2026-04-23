import { type NextRequest } from "next/server";
import { getRegistrations } from "@/lib/chat/store";
import type { ChatRegistration, UnifiedChatMessage } from "@/lib/chat/types";
import { fetchYouTubeChat } from "@/lib/chat/adapters/youtube";
import { fetchTwitchChat } from "@/lib/chat/adapters/twitch";
import { fetchFacebookChat } from "@/lib/chat/adapters/facebook";

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID ?? "";

const HEARTBEAT_INTERVAL_MS = 15_000;
const DEFAULT_POLL_INTERVAL_MS = 5_000;

interface PlatformPollState {
	youtube?: { pageToken?: string; pollingIntervalMs: number };
	twitch?: { cursor?: string };
	facebook?: { since?: number };
}

function formatSSE(message: UnifiedChatMessage): string {
	return `data: ${JSON.stringify(message)}\n\n`;
}

async function pollPlatform(
	reg: ChatRegistration,
	state: PlatformPollState,
): Promise<UnifiedChatMessage[]> {
	switch (reg.platform) {
		case "youtube": {
			if (!reg.chatId) return [];
			const ytState = state.youtube ?? { pollingIntervalMs: DEFAULT_POLL_INTERVAL_MS };
			const result = await fetchYouTubeChat(reg.accessToken, reg.chatId, ytState.pageToken);
			state.youtube = {
				pageToken: result.nextPageToken,
				pollingIntervalMs: result.pollingIntervalMs,
			};
			return result.messages;
		}
		case "twitch": {
			if (!reg.channelName && !reg.chatId) return [];
			const twState = state.twitch ?? {};
			// channelName is used as broadcaster ID for the Helix endpoint
			const broadcasterId = reg.channelName ?? reg.chatId ?? "";
			const result = await fetchTwitchChat(reg.accessToken, broadcasterId, TWITCH_CLIENT_ID, twState.cursor);
			state.twitch = { cursor: result.cursor };
			return result.messages;
		}
		case "facebook": {
			if (!reg.broadcastId) return [];
			const fbState = state.facebook ?? {};
			const result = await fetchFacebookChat(reg.accessToken, reg.broadcastId, fbState.since);
			if (result.latestTimestamp) {
				state.facebook = { since: result.latestTimestamp };
			}
			return result.messages;
		}
	}
}

export async function GET(request: NextRequest) {
	const npub = request.nextUrl.searchParams.get("npub");

	if (!npub) {
		return new Response(JSON.stringify({ error: "missing_npub", message: "npub query parameter is required" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	const registrations = getRegistrations(npub);

	const encoder = new TextEncoder();
	const pollStates = new Map<string, PlatformPollState>();

	// Initialize poll state per platform
	for (const reg of registrations) {
		pollStates.set(reg.platform, {});
	}

	const stream = new ReadableStream({
		start(controller) {
			const abortSignal = request.signal;
			let closed = false;

			function cleanup() {
				closed = true;
				for (const id of intervalIds) {
					clearInterval(id);
				}
				clearInterval(heartbeatId);
				try {
					controller.close();
				} catch {
					// Stream already closed
				}
			}

			abortSignal.addEventListener("abort", cleanup);

			const intervalIds: ReturnType<typeof setInterval>[] = [];

			// Set up polling for each registered platform
			for (const reg of registrations) {
				const state = pollStates.get(reg.platform) ?? {};
				pollStates.set(reg.platform, state);

				const pollInterval =
					reg.platform === "youtube" ? (state.youtube?.pollingIntervalMs ?? DEFAULT_POLL_INTERVAL_MS) : DEFAULT_POLL_INTERVAL_MS;

				const id = setInterval(async () => {
					if (closed) return;
					try {
						const currentState = pollStates.get(reg.platform) ?? {};
						const messages = await pollPlatform(reg, currentState);
						pollStates.set(reg.platform, currentState);

						for (const msg of messages) {
							if (closed) return;
							controller.enqueue(encoder.encode(formatSSE(msg)));
						}
					} catch (err) {
						// Never crash the SSE stream on a single platform error
						console.error(`[chat/stream] Error polling ${reg.platform}:`, err);
					}
				}, pollInterval);

				intervalIds.push(id);
			}

			// Heartbeat to keep connection alive
			const heartbeatId = setInterval(() => {
				if (closed) return;
				try {
					controller.enqueue(encoder.encode(":\n\n"));
				} catch {
					cleanup();
				}
			}, HEARTBEAT_INTERVAL_MS);

			// Send initial heartbeat so the client knows the connection is active
			controller.enqueue(encoder.encode(":\n\n"));
		},
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache, no-transform",
			Connection: "keep-alive",
			"X-Accel-Buffering": "no",
		},
	});
}
