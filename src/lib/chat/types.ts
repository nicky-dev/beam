export interface UnifiedChatMessage {
	id: string;
	source: "nostr" | "youtube" | "twitch" | "facebook";
	author: {
		id: string;
		name: string;
		avatar?: string;
	};
	content: string;
	/** Unix seconds */
	timestamp: number;
	donation?: {
		/** Display string: "100 sats", "$5.00", "¥500" */
		amount: string;
		/** "sats", "USD", "JPY", etc. */
		currency: string;
	};
}

export interface ChatRegistration {
	npub: string;
	platform: ChatPlatform;
	accessToken: string;
	/** YouTube liveChatId */
	chatId?: string;
	/** Facebook live_video ID */
	broadcastId?: string;
	/** Twitch channel login name */
	channelName?: string;
}

export type ChatPlatform = "youtube" | "twitch" | "facebook";
