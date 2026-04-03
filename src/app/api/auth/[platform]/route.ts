import { NextRequest, NextResponse } from 'next/server'

type Platform = 'youtube' | 'twitch' | 'facebook' | 'tiktok'

interface OAuthConfig {
	authUrl: string
	clientId: string
	scopes: string
	clientIdParam?: string // defaults to "client_id"
}

const OAUTH_CONFIGS: Record<Platform, OAuthConfig> = {
	youtube: {
		authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
		clientId: process.env.YOUTUBE_CLIENT_ID ?? '',
		scopes: 'https://www.googleapis.com/auth/youtube.readonly',
	},
	twitch: {
		authUrl: 'https://id.twitch.tv/oauth2/authorize',
		clientId: process.env.TWITCH_CLIENT_ID ?? '',
		scopes: 'channel:read:stream_key',
	},
	facebook: {
		authUrl: 'https://www.facebook.com/dialog/oauth',
		clientId: process.env.FACEBOOK_APP_ID ?? '',
		scopes: 'user_videos',
	},
	tiktok: {
		authUrl: 'https://www.tiktok.com/v2/auth/authorize',
		clientId: process.env.TIKTOK_CLIENT_KEY ?? '',
		scopes: 'live.room.push_permission',
		clientIdParam: 'client_key',
	},
}

const PLATFORMS = Object.keys(OAUTH_CONFIGS) as Platform[]

function notConfiguredHtml(platform: string): NextResponse {
	const message = JSON.stringify({
		type: 'oauth-error',
		platform,
		error: `${platform} OAuth is not configured. Please set the required environment variables.`,
	})
	return new NextResponse(
		`<!DOCTYPE html><html><body><script>
  if (window.opener) {
    window.opener.postMessage(${message}, window.location.origin);
  }
  window.close();
</script><p>Not configured. This window will close automatically.</p>
</body></html>`,
		{ headers: { 'Content-Type': 'text/html' } },
	)
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
	const { platform } = await params

	if (!PLATFORMS.includes(platform as Platform)) {
		return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
	}

	const config = OAUTH_CONFIGS[platform as Platform]

	if (!config.clientId) {
		return notConfiguredHtml(platform)
	}

	const appUrl = process.env.NEXT_PUBLIC_APP_URL
	if (!appUrl && process.env.NODE_ENV === 'production') {
		return notConfiguredHtml(platform)
	}
	const resolvedAppUrl = appUrl ?? 'http://localhost:3080'
	const redirectUri = `${resolvedAppUrl}/api/auth/${platform}/callback`

	const clientIdParam = config.clientIdParam ?? 'client_id'
	const searchParams = new URLSearchParams({
		[clientIdParam]: config.clientId,
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: config.scopes,
	})

	if (platform === 'youtube') {
		searchParams.set('access_type', 'online')
	}

	return NextResponse.redirect(`${config.authUrl}?${searchParams.toString()}`)
}
