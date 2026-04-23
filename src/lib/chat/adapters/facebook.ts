import type { UnifiedChatMessage } from "../types";

const FACEBOOK_API_VERSION = process.env.FACEBOOK_API_VERSION ?? "v20.0";

interface FacebookChatResult {
	messages: UnifiedChatMessage[];
	latestTimestamp?: number;
}

interface FacebookComment {
	id: string;
	from?: {
		id: string;
		name: string;
	};
	message: string;
	created_time: string;
}

interface FacebookCommentsResponse {
	data?: FacebookComment[];
	paging?: {
		next?: string;
	};
}

/**
 * Fetch Facebook Live comments for a live video.
 * Uses `live_filter=stream` to get only comments posted during the live stream.
 * The `since` parameter filters by unix timestamp to avoid re-fetching old comments.
 */
export async function fetchFacebookChat(
	accessToken: string,
	liveVideoId: string,
	since?: number,
): Promise<FacebookChatResult> {
	const url = new URL(`https://graph.facebook.com/${FACEBOOK_API_VERSION}/${liveVideoId}/comments`);
	url.searchParams.set("live_filter", "stream");
	url.searchParams.set("fields", "from,message,created_time");
	url.searchParams.set("access_token", accessToken);
	if (since) {
		url.searchParams.set("since", since.toString());
	}

	const res = await fetch(url.toString());

	if (!res.ok) {
		if (res.status === 401 || res.status === 403) {
			console.warn(`[chat/facebook] Auth error ${res.status} — token may be expired`);
		} else {
			console.warn(`[chat/facebook] HTTP ${res.status} fetching live comments`);
		}
		return { messages: [] };
	}

	const data = (await res.json()) as FacebookCommentsResponse;
	let latestTimestamp: number | undefined;

	const messages: UnifiedChatMessage[] = (data.data ?? []).map((comment) => {
		const ts = Math.floor(new Date(comment.created_time).getTime() / 1000);
		if (!latestTimestamp || ts > latestTimestamp) {
			latestTimestamp = ts;
		}
		return {
			id: `fb-${comment.id}`,
			source: "facebook" as const,
			author: {
				id: comment.from?.id ?? "unknown",
				name: comment.from?.name ?? "Facebook User",
			},
			content: comment.message,
			timestamp: ts,
		};
	});

	return { messages, latestTimestamp };
}
