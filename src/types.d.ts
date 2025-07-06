namespace globalThis {
	interface Window {
		nostr?: {
			isEnabled(): Promise<boolean>;
			enable(): Promise<void>;
			getPublicKey(): Promise<string>;
			signEvent(event: any): Promise<any>;
		};
	}
}
