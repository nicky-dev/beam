interface Nip07UnsignedEvent {
	kind: number;
	content: string;
	tags: string[][];
	created_at: number;
}

interface Nip07SignedEvent extends Nip07UnsignedEvent {
	id: string;
	pubkey: string;
	sig: string;
}

namespace globalThis {
	interface Window {
		nostr?: {
			isEnabled(): Promise<boolean>;
			enable(): Promise<void>;
			getPublicKey(): Promise<string>;
			signEvent(event: Nip07UnsignedEvent): Promise<Nip07SignedEvent>;
			getRelays?(): Promise<Record<string, { read: boolean; write: boolean }>>;
			nip04?: {
				encrypt(pubkey: string, plaintext: string): Promise<string>;
				decrypt(pubkey: string, ciphertext: string): Promise<string>;
			};
		};
	}
}
