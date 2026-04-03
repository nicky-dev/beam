import { NextRequest, NextResponse } from "next/server";

type Platform = "youtube" | "twitch" | "facebook";

interface StreamCredentials {
	streamKey: string;
	serverUrl: string;
}

interface TokenConfig {
	tokenUrl: string;
	clientId: string;
	clientSecret: string;
}

const TOKEN_CONFIGS: Record<Platform, TokenConfig> = {
	youtube: {
		tokenUrl: "https://oauth2.googleapis.com/token",
		clientId: process.env.YOUTUBE_CLIENT_ID ?? "",
		clientSecret: process.env.YOUTUBE_CLIENT_SECRET ?? "",
	},
	twitch: {
		tokenUrl: "https://id.twitch.tv/oauth2/token",
		clientId: process.env.TWITCH_CLIENT_ID ?? "",
		clientSecret: process.env.TWITCH_CLIENT_SECRET ?? "",
	},
	facebook: {
		tokenUrl: "https://graph.facebook.com/v20.0/oauth/access_token",
		clientId: process.env.FACEBOOK_APP_ID ?? "",
		clientSecret: process.env.FACEBOOK_APP_SECRET ?? "",
	},
};

const PLATFORMS = Object.keys(TOKEN_CONFIGS) as Platform[];

async function exchangeCodeForToken(
	platform: Platform,
	code: string,
	redirectUri: string,
): Promise<string> {
	const config = TOKEN_CONFIGS[platform];
	const response = await fetch(config.tokenUrl, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			code,
			client_id: config.clientId,
			client_secret: config.clientSecret,
			redirect_uri: redirectUri,
			grant_type: "authorization_code",
		}),
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Token exchange failed: ${text}`);
	}

	const data = await response.json();
	return data.access_token as string;
}

async function getYouTubeStreamCredentials(
	accessToken: string,
): Promise<StreamCredentials> {
	const response = await fetch(
		"https://www.googleapis.com/youtube/v3/liveStreams?part=cdn&mine=true",
		{ headers: { Authorization: `Bearer ${accessToken}` } },
	);

	if (!response.ok) {
		throw new Error("Failed to fetch YouTube stream details");
	}

	const data = await response.json();
	const stream = data.items?.[0];

	if (!stream) {
		throw new Error(
			"No YouTube live streams found. Please create a live stream in YouTube Studio first.",
		);
	}

	return {
		streamKey: stream.cdn.ingestionInfo.streamName as string,
		serverUrl: `${stream.cdn.ingestionInfo.ingestionAddress as string}/`,
	};
}

async function getTwitchStreamCredentials(
	accessToken: string,
): Promise<StreamCredentials> {
	const clientId = process.env.TWITCH_CLIENT_ID ?? "";

	const userResponse = await fetch("https://api.twitch.tv/helix/users", {
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Client-Id": clientId,
		},
	});

	if (!userResponse.ok) {
		throw new Error("Failed to fetch Twitch user info");
	}

	const userData = await userResponse.json();
	const broadcasterId = userData.data?.[0]?.id as string | undefined;

	if (!broadcasterId) {
		throw new Error("Failed to retrieve Twitch broadcaster ID");
	}

	const keyResponse = await fetch(
		`https://api.twitch.tv/helix/streams/key?broadcaster_id=${broadcasterId}`,
		{
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Client-Id": clientId,
			},
		},
	);

	if (!keyResponse.ok) {
		throw new Error("Failed to fetch Twitch stream key");
	}

	const keyData = await keyResponse.json();
	const streamKey = keyData.data?.[0]?.stream_key as string | undefined;

	if (!streamKey) {
		throw new Error("No Twitch stream key found");
	}

	return {
		streamKey,
		serverUrl: "rtmp://live.twitch.tv/app/",
	};
}

async function getFacebookStreamCredentials(
	accessToken: string,
): Promise<StreamCredentials> {
	const response = await fetch(
		"https://graph.facebook.com/v20.0/me/live_videos",
		{
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				access_token: accessToken,
				status: "SCHEDULED_UNPUBLISHED",
				title: "Live Stream",
			}),
		},
	);

	if (!response.ok) {
		throw new Error("Failed to create Facebook live video session");
	}

	const data = await response.json();
	// Prefer secure stream URL; fall back to plain stream URL
	const streamUrl: string = data.secure_stream_url || data.stream_url;

	if (!streamUrl) {
		throw new Error("No stream URL returned from Facebook");
	}

	// Facebook URL format: rtmps://live-api-s.facebook.com:443/rtmp/{stream_key}
	const lastSlash = streamUrl.lastIndexOf("/");
	const streamKey = streamUrl.slice(lastSlash + 1);
	const serverUrl = `${streamUrl.slice(0, lastSlash + 1)}`;

	return { streamKey, serverUrl };
}

async function getStreamCredentials(
	platform: Platform,
	accessToken: string,
): Promise<StreamCredentials> {
	switch (platform) {
		case "youtube":
			return getYouTubeStreamCredentials(accessToken);
		case "twitch":
			return getTwitchStreamCredentials(accessToken);
		case "facebook":
			return getFacebookStreamCredentials(accessToken);
	}
}

function buildResponseHtml(
	platform: string,
	credentials: StreamCredentials | null,
	error: string | null,
): string {
	const message =
		credentials !== null
			? JSON.stringify({
					type: "oauth-success",
					platform,
					streamKey: credentials.streamKey,
					serverUrl: credentials.serverUrl,
				})
			: JSON.stringify({ type: "oauth-error", platform, error });

	return `<!DOCTYPE html>
<html><body><script>
  if (window.opener) {
    window.opener.postMessage(${message}, window.location.origin);
  }
  window.close();
</script><p>Connecting... This window will close automatically.</p>
</body></html>`;
}

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ platform: string }> },
) {
	const { platform } = await params;
	const htmlHeaders = { "Content-Type": "text/html" };

	if (!PLATFORMS.includes(platform as Platform)) {
		return new NextResponse(
			buildResponseHtml(platform, null, "Invalid platform"),
			{ headers: htmlHeaders },
		);
	}

	const { searchParams } = new URL(request.url);
	const code = searchParams.get("code");
	const oauthError = searchParams.get("error");

	if (oauthError || !code) {
		return new NextResponse(
			buildResponseHtml(
				platform,
				null,
				oauthError ?? "Authorization was denied",
			),
			{ headers: htmlHeaders },
		);
	}

	const appUrl = process.env.NEXT_PUBLIC_APP_URL;
	if (!appUrl && process.env.NODE_ENV === "production") {
		return new NextResponse(
			buildResponseHtml(
				platform,
				null,
				"NEXT_PUBLIC_APP_URL is not configured. Cannot verify OAuth redirect URI.",
			),
			{ headers: htmlHeaders },
		);
	}
	const redirectUri = `${appUrl ?? "http://localhost:3080"}/api/auth/${platform}/callback`;

	try {
		const accessToken = await exchangeCodeForToken(
			platform as Platform,
			code,
			redirectUri,
		);
		const credentials = await getStreamCredentials(
			platform as Platform,
			accessToken,
		);
		return new NextResponse(
			buildResponseHtml(platform, credentials, null),
			{ headers: htmlHeaders },
		);
	} catch (err) {
		const message =
			err instanceof Error ? err.message : "Failed to retrieve stream key";
		return new NextResponse(
			buildResponseHtml(platform, null, message),
			{ headers: htmlHeaders },
		);
	}
}
