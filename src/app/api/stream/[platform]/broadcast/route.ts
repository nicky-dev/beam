import { NextRequest, NextResponse } from "next/server";

type Platform = "youtube" | "twitch" | "facebook" | "tiktok";

const FACEBOOK_API_VERSION = process.env.FACEBOOK_API_VERSION ?? "v20.0";
const PLATFORMS: Platform[] = ["youtube", "twitch", "facebook", "tiktok"];

interface BroadcastRequest {
	accessToken: string;
	title: string;
	description?: string;
	image?: string;
}

interface BroadcastResponse {
	broadcastId: string;
	streamKey?: string;
	serverUrl?: string;
	chatId?: string;
}

interface ErrorResponse {
	error: string;
	message: string;
}

// --- YouTube ---

async function createYouTubeBroadcast(req: BroadcastRequest): Promise<BroadcastResponse> {
	const { accessToken, title, description } = req;
	const headers = {
		Authorization: `Bearer ${accessToken}`,
		"Content-Type": "application/json",
	};

	// 1. Create liveBroadcast
	const broadcastRes = await fetch(
		"https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet,status,contentDetails",
		{
			method: "POST",
			headers,
			body: JSON.stringify({
				snippet: {
					title,
					description: description ?? "",
					scheduledStartTime: new Date().toISOString(),
				},
				status: { privacyStatus: "public" },
				contentDetails: { enableAutoStart: true, enableAutoStop: true },
			}),
		},
	);

	if (!broadcastRes.ok) {
		const text = await broadcastRes.text();
		if (broadcastRes.status === 401) {
			throw tokenExpiredError("YouTube");
		}
		throw new Error(`Failed to create YouTube broadcast: ${text}`);
	}

	const broadcast = await broadcastRes.json();
	const broadcastId = broadcast.id as string;
	const liveChatId = broadcast.snippet?.liveChatId as string | undefined;

	// 2. List the user's liveStream to get ingestion info
	const streamListRes = await fetch(
		"https://www.googleapis.com/youtube/v3/liveStreams?part=cdn,id&mine=true",
		{ headers },
	);

	if (!streamListRes.ok) {
		throw new Error("Failed to list YouTube live streams. Check your YouTube Studio setup.");
	}

	const streamListData = await streamListRes.json();
	const stream = streamListData.items?.[0];

	if (!stream) {
		throw new Error("No YouTube live stream found. Please create a live stream in YouTube Studio first.");
	}

	const streamId = stream.id as string;
	const ingestionInfo = stream.cdn?.ingestionInfo;
	const streamKey = ingestionInfo?.streamName as string | undefined;
	const serverUrl = ingestionInfo?.ingestionAddress
		? `${ingestionInfo.ingestionAddress as string}/`
		: undefined;

	// 3. Bind broadcast to stream
	const bindRes = await fetch(
		`https://www.googleapis.com/youtube/v3/liveBroadcasts/bind?id=${broadcastId}&part=id&streamId=${streamId}`,
		{ method: "POST", headers },
	);

	if (!bindRes.ok) {
		const text = await bindRes.text();
		throw new Error(`Failed to bind YouTube broadcast to stream: ${text}`);
	}

	return { broadcastId, streamKey, serverUrl, chatId: liveChatId };
}

// --- Twitch ---

async function createTwitchBroadcast(req: BroadcastRequest): Promise<BroadcastResponse> {
	const { accessToken, title } = req;
	const clientId = process.env.TWITCH_CLIENT_ID ?? "";
	const headers = {
		Authorization: `Bearer ${accessToken}`,
		"Client-Id": clientId,
	};

	// 1. Get broadcaster ID
	const userRes = await fetch("https://api.twitch.tv/helix/users", { headers });

	if (!userRes.ok) {
		if (userRes.status === 401) {
			throw tokenExpiredError("Twitch");
		}
		throw new Error("Failed to fetch Twitch user info.");
	}

	const userData = await userRes.json();
	const broadcasterId = userData.data?.[0]?.id as string | undefined;

	if (!broadcasterId) {
		throw new Error("Failed to retrieve Twitch broadcaster ID.");
	}

	// 2. Update channel info with title
	const patchRes = await fetch(`https://api.twitch.tv/helix/channels?broadcaster_id=${broadcasterId}`, {
		method: "PATCH",
		headers: { ...headers, "Content-Type": "application/json" },
		body: JSON.stringify({ title }),
	});

	if (!patchRes.ok) {
		const text = await patchRes.text();
		throw new Error(`Failed to update Twitch channel title: ${text}`);
	}

	// Twitch goes live automatically when RTMP push starts
	return { broadcastId: broadcasterId };
}

// --- Facebook ---

async function createFacebookBroadcast(req: BroadcastRequest): Promise<BroadcastResponse> {
	const { accessToken, title, description } = req;

	const params = new URLSearchParams({
		access_token: accessToken,
		title,
		description: description ?? "",
		status: "SCHEDULED_UNPUBLISHED",
	});

	const response = await fetch(`https://graph.facebook.com/${FACEBOOK_API_VERSION}/me/live_videos`, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: params,
	});

	if (!response.ok) {
		if (response.status === 401) {
			throw tokenExpiredError("Facebook");
		}
		const text = await response.text();
		throw new Error(`Failed to create Facebook live video: ${text}`);
	}

	const data = await response.json();
	const liveVideoId = data.id as string;
	const streamUrl: string = data.secure_stream_url || data.stream_url;

	if (!streamUrl) {
		throw new Error("No stream URL returned from Facebook. Ensure your account is approved for Facebook Live.");
	}

	// Parse stream URL: rtmps://live-api-s.facebook.com:443/rtmp/{stream_key}
	const lastSlash = streamUrl.lastIndexOf("/");
	const streamKey = streamUrl.slice(lastSlash + 1);
	const serverUrl = streamUrl.slice(0, lastSlash + 1);

	return { broadcastId: liveVideoId, streamKey, serverUrl };
}

// --- TikTok ---

async function createTikTokBroadcast(req: BroadcastRequest): Promise<BroadcastResponse> {
	const { accessToken, title } = req;

	const response = await fetch("https://open.tiktokapis.com/v2/live/room/create/", {
		method: "POST",
		headers: {
			"Content-Type": "application/json; charset=UTF-8",
			Authorization: `Bearer ${accessToken}`,
		},
		body: JSON.stringify({ title }),
	});

	if (!response.ok) {
		if (response.status === 401) {
			throw tokenExpiredError("TikTok");
		}
		const text = await response.text();
		throw new Error(`Failed to create TikTok live room: ${text}`);
	}

	const data = await response.json();
	const roomId = data.data?.room_id as string | undefined;
	const streamKey = data.data?.stream_key as string | undefined;
	const streamUrl = data.data?.stream_url as string | undefined;

	if (!roomId || !streamKey || !streamUrl) {
		throw new Error("Incomplete response from TikTok live room creation. Your account may not meet live streaming requirements.");
	}

	return { broadcastId: roomId, streamKey, serverUrl: streamUrl };
}

// --- Helpers ---

function tokenExpiredError(platform: string): Error & { code: string } {
	const err = new Error(`${platform} access token has expired. Please reconnect your ${platform} account.`) as Error & {
		code: string;
	};
	err.code = "token_expired";
	return err;
}

async function createBroadcast(platform: Platform, req: BroadcastRequest): Promise<BroadcastResponse> {
	switch (platform) {
		case "youtube":
			return createYouTubeBroadcast(req);
		case "twitch":
			return createTwitchBroadcast(req);
		case "facebook":
			return createFacebookBroadcast(req);
		case "tiktok":
			return createTikTokBroadcast(req);
	}
}

// --- Route Handler ---

export async function POST(request: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
	const { platform } = await params;

	if (!PLATFORMS.includes(platform as Platform)) {
		return NextResponse.json({ error: "invalid_platform", message: "Invalid platform" } satisfies ErrorResponse, {
			status: 400,
		});
	}

	let body: BroadcastRequest;
	try {
		body = (await request.json()) as BroadcastRequest;
	} catch {
		return NextResponse.json(
			{ error: "invalid_body", message: "Request body must be valid JSON" } satisfies ErrorResponse,
			{ status: 400 },
		);
	}

	if (!body.accessToken || !body.title) {
		return NextResponse.json(
			{
				error: "missing_fields",
				message: "accessToken and title are required",
			} satisfies ErrorResponse,
			{ status: 400 },
		);
	}

	try {
		const result = await createBroadcast(platform as Platform, body);
		return NextResponse.json(result);
	} catch (err) {
		const isTokenExpired = err instanceof Error && "code" in err && (err as Error & { code: string }).code === "token_expired";
		const message = err instanceof Error ? err.message : "Failed to create broadcast";

		return NextResponse.json(
			{
				error: isTokenExpired ? "token_expired" : "broadcast_failed",
				message,
			} satisfies ErrorResponse,
			{ status: isTokenExpired ? 401 : 500 },
		);
	}
}
