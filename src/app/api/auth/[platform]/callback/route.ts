import { PLATFORM_RTMP_URLS } from "@/lib/streaming/constants";
import { NextRequest, NextResponse } from "next/server";

type Platform = "youtube" | "twitch" | "facebook" | "tiktok";

const FACEBOOK_API_VERSION = process.env.FACEBOOK_API_VERSION ?? "v20.0";

interface StreamCredentials {
	streamKey: string;
	serverUrl: string;
	accessToken: string;
	refreshToken?: string;
}

interface TokenConfig {
	tokenUrl: string;
	clientId: string;
	clientSecret: string;
	clientIdParam?: string; // defaults to "client_id"
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
		tokenUrl: `https://graph.facebook.com/${FACEBOOK_API_VERSION}/oauth/access_token`,
		clientId: process.env.FACEBOOK_APP_ID ?? "",
		clientSecret: process.env.FACEBOOK_APP_SECRET ?? "",
	},
	tiktok: {
		tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
		clientId: process.env.TIKTOK_CLIENT_KEY ?? "",
		clientSecret: process.env.TIKTOK_CLIENT_SECRET ?? "",
		clientIdParam: "client_key",
	},
};

const PLATFORMS = Object.keys(TOKEN_CONFIGS) as Platform[];

async function exchangeCodeForToken(
	platform: Platform,
	code: string,
	redirectUri: string,
): Promise<{ accessToken: string; refreshToken?: string }> {
	const config = TOKEN_CONFIGS[platform];
	const clientIdParam = config.clientIdParam ?? "client_id";
	const response = await fetch(config.tokenUrl, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			code,
			[clientIdParam]: config.clientId,
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

	// TikTok returns nested response: { data: { access_token, refresh_token, ... }, error: { ... } }
	// Other platforms return flat: { access_token, refresh_token, ... }
	if (platform === "tiktok" && data.data) {
		return {
			accessToken: data.data.access_token as string,
			refreshToken: data.data.refresh_token as string | undefined,
		};
	}

	return {
		accessToken: data.access_token as string,
		refreshToken: data.refresh_token as string | undefined,
	};
}

async function getYouTubeStreamCredentials(
	accessToken: string,
	refreshToken?: string,
): Promise<StreamCredentials> {
	const response = await fetch(
		"https://www.googleapis.com/youtube/v3/liveStreams?part=cdn&mine=true",
		{ headers: { Authorization: `Bearer ${accessToken}` } },
	);

	if (!response.ok) {
		throw new Error(
			"Failed to fetch YouTube stream details. Your YouTube access token may have expired — try reconnecting.",
		);
	}

	const data = await response.json();
	const stream = data.items?.[0];

	if (!stream) {
		throw new Error(
			"No YouTube live streams found. Please create a live stream in YouTube Studio first.",
		);
	}

	const ingestionInfo = stream?.cdn?.ingestionInfo;
	if (!ingestionInfo?.streamName || !ingestionInfo?.ingestionAddress) {
		throw new Error(
			"YouTube stream is missing ingestion info. Check your live stream setup in YouTube Studio.",
		);
	}

	return {
		streamKey: ingestionInfo.streamName as string,
		serverUrl: `${ingestionInfo.ingestionAddress as string}/`,
		accessToken,
		refreshToken,
	};
}

async function getTwitchStreamCredentials(accessToken: string): Promise<StreamCredentials> {
	const clientId = process.env.TWITCH_CLIENT_ID ?? "";

	const userResponse = await fetch("https://api.twitch.tv/helix/users", {
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Client-Id": clientId,
		},
	});

	if (!userResponse.ok) {
		throw new Error(
			"Failed to fetch Twitch user info. Your Twitch access token may have expired — try reconnecting.",
		);
	}

	const userData = await userResponse.json();
	const broadcasterId = userData.data?.[0]?.id as string | undefined;

	if (!broadcasterId) {
		throw new Error(
			"Failed to retrieve Twitch broadcaster ID. Ensure your Twitch account is set up for streaming.",
		);
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
		throw new Error(
			"Failed to fetch Twitch stream key. Ensure your Twitch account has streaming enabled.",
		);
	}

	const keyData = await keyResponse.json();
	const streamKey = keyData.data?.[0]?.stream_key as string | undefined;

	if (!streamKey) {
		throw new Error(
			"No Twitch stream key found. Please enable streaming in your Twitch dashboard.",
		);
	}

	return {
		streamKey,
		serverUrl: PLATFORM_RTMP_URLS.twitch,
		accessToken,
	};
}

// Per decision D3: defer broadcast creation to "Start Forward" time.
// At OAuth time, only validate the token and return placeholder credentials.
async function getFacebookStreamCredentials(accessToken: string): Promise<StreamCredentials> {
	const response = await fetch(
		`https://graph.facebook.com/${FACEBOOK_API_VERSION}/me?access_token=${accessToken}`,
	);

	if (!response.ok) {
		throw new Error(
			"Failed to validate Facebook token. Check that your Facebook account has live streaming permissions.",
		);
	}

	return {
		streamKey: "",
		serverUrl: PLATFORM_RTMP_URLS.facebook,
		accessToken,
	};
}

// Per decision D3: defer room creation to "Start Forward" time.
// At OAuth time, only validate the token and return placeholder credentials.
async function getTikTokStreamCredentials(accessToken: string): Promise<StreamCredentials> {
	// TikTok user info API requires 'fields' query parameter
	const response = await fetch(
		"https://open.tiktokapis.com/v2/user/info/?fields=display_name,avatar_url",
		{
			headers: { Authorization: `Bearer ${accessToken}` },
		},
	);

	if (!response.ok) {
		throw new Error(
			"Failed to validate TikTok token. Ensure your TikTok account meets the live streaming requirements.",
		);
	}

	return {
		streamKey: "",
		serverUrl: PLATFORM_RTMP_URLS.tiktok,
		accessToken,
	};
}

async function getStreamCredentials(
	platform: Platform,
	accessToken: string,
	refreshToken?: string,
): Promise<StreamCredentials> {
	switch (platform) {
		case "youtube":
			return getYouTubeStreamCredentials(accessToken, refreshToken);
		case "twitch":
			return getTwitchStreamCredentials(accessToken);
		case "facebook":
			return getFacebookStreamCredentials(accessToken);
		case "tiktok":
			return getTikTokStreamCredentials(accessToken);
	}
}

function buildResponseHtml(
	platform: string,
	credentials: StreamCredentials | null,
	error: string | null,
): string {
	const messageObj =
		credentials !== null
			? {
					type: "oauth-success",
					platform,
					streamKey: credentials.streamKey,
					serverUrl: credentials.serverUrl,
					accessToken: credentials.accessToken,
					refreshToken: credentials.refreshToken,
				}
			: { type: "oauth-error", platform, error };

	// Double-stringify creates a safe JS string literal; escaping </ prevents
	// breaking out of the <script> tag (XSS via credential values).
	const safeMessageLiteral = JSON.stringify(JSON.stringify(messageObj)).replace(
		/<\//g,
		"<\\/",
	);

	return `<!DOCTYPE html>
<html><body><script>
  if (window.opener) {
    window.opener.postMessage(JSON.parse(${safeMessageLiteral}), window.location.origin);
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
		const { accessToken, refreshToken } = await exchangeCodeForToken(
			platform as Platform,
			code,
			redirectUri,
		);
		const credentials = await getStreamCredentials(
			platform as Platform,
			accessToken,
			refreshToken,
		);
		return new NextResponse(
			buildResponseHtml(platform, credentials, null),
			{ headers: htmlHeaders },
		);
	} catch (err) {
		const message =
			err instanceof Error ? err.message : "Failed to retrieve stream key";
		console.error(`[OAuth Callback Error] Platform: ${platform}, Error:`, err);
		return new NextResponse(
			buildResponseHtml(platform, null, message),
			{ headers: htmlHeaders },
		);
	}
}
