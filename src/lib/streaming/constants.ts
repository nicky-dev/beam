/**
 * Default RTMP server URLs for each supported streaming platform.
 * Used by OAuth credential fetchers (fallback) and ForwardStreamSettings (default config).
 */
export const PLATFORM_RTMP_URLS = {
	youtube: "rtmp://a.rtmp.youtube.com/live2/",
	facebook: "rtmps://live-api-s.facebook.com:443/rtmp/",
	twitch: "rtmp://live.twitch.tv/app/",
	tiktok: "rtmp://push.tiktok.com/live/",
} as const;

export type StreamingPlatform = keyof typeof PLATFORM_RTMP_URLS;
