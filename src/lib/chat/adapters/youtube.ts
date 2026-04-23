import type { UnifiedChatMessage } from "../types";

interface YouTubeChatResult {
	messages: UnifiedChatMessage[];
	nextPageToken?: string;
	pollingIntervalMs: number;
}

interface YouTubeChatItem {
	id: string;
	snippet: {
		type: string;
		displayMessage: string;
		publishedAt: string;
		superChatDetails?: {
			amountDisplayString: string;
			currency: string;
		};
		superStickerDetails?: {
			amountDisplayString: string;
			currency: string;
		};
	};
	authorDetails: {
		channelId: string;
		displayName: string;
		profileImageUrl?: string;
	};
}

interface YouTubeChatResponse {
	items?: YouTubeChatItem[];
	nextPageToken?: string;
	pollingIntervalMillis?: number;
}

export async function fetchYouTubeChat(
	accessToken: string,
	liveChatId: string,
	pageToken?: string,
): Promise<YouTubeChatResult> {
	const url = new URL("https://www.googleapis.com/youtube/v3/liveChat/messages");
	url.searchParams.set("liveChatId", liveChatId);
	url.searchParams.set("part", "snippet,authorDetails");
	if (pageToken) {
		url.searchParams.set("pageToken", pageToken);
	}

	const res = await fetch(url.toString(), {
		headers: { Authorization: `Bearer ${accessToken}` },
	});

	if (!res.ok) {
		if (res.status === 401 || res.status === 403) {
			console.warn(`[chat/youtube] Auth error ${res.status} fetching live chat — token may be expired`);
		} else {
			console.warn(`[chat/youtube] HTTP ${res.status} fetching live chat`);
		}
		return { messages: [], pollingIntervalMs: 10_000 };
	}

	const data = (await res.json()) as YouTubeChatResponse;
	const messages: UnifiedChatMessage[] = (data.items ?? []).map((item) => {
		const superChat = item.snippet.superChatDetails ?? item.snippet.superStickerDetails;
		return {
			id: `yt-${item.id}`,
			source: "youtube" as const,
			author: {
				id: item.authorDetails.channelId,
				name: item.authorDetails.displayName,
				avatar: item.authorDetails.profileImageUrl,
			},
			content: item.snippet.displayMessage,
			timestamp: Math.floor(new Date(item.snippet.publishedAt).getTime() / 1000),
			...(superChat
				? {
						donation: {
							amount: superChat.amountDisplayString,
							currency: superChat.currency,
						},
					}
				: {}),
		};
	});

	return {
		messages,
		nextPageToken: data.nextPageToken,
		pollingIntervalMs: data.pollingIntervalMillis ?? 5_000,
	};
}
