"use client";
import React, { useMemo } from "react";
import { NDKEvent, NDKKind, zapInvoiceFromEvent } from "@nostr-dev-kit/ndk";
import { useRealtimeProfile } from "nostr-hooks";
import { nip19 } from "nostr-tools";
import type { UnifiedChatMessage } from "@/lib/chat/types";
import PlatformChatMessage from "./PlatformChatMessage";

interface NostrChatMessageAdapterProps {
	event: NDKEvent;
}

const NostrChatMessageAdapter: React.FC<NostrChatMessageAdapterProps> = ({ event }) => {
	const pubkey = useMemo(
		() => (event.kind === NDKKind.Zap ? zapInvoiceFromEvent(event)?.zappee : event.pubkey),
		[event],
	);

	const { profile } = useRealtimeProfile(pubkey);

	const message: UnifiedChatMessage = useMemo(() => {
		const npub = pubkey ? nip19.npubEncode(pubkey) : "";
		const displayName = profile?.displayName || profile?.name || npub.substring(0, 8);

		const invoice = event.kind === NDKKind.Zap ? zapInvoiceFromEvent(event) : undefined;
		const donation = invoice?.amount
			? {
					amount: `${(Number(invoice.amount) / 1000).toLocaleString()} sats`,
					currency: "sats",
				}
			: undefined;

		const content =
			event.kind === NDKKind.Zap ? event.content || invoice?.comment || "" : event.content;

		return {
			id: event.id,
			source: "nostr" as const,
			author: {
				id: pubkey || event.pubkey,
				name: displayName,
				avatar: profile?.image || profile?.picture,
			},
			content,
			timestamp: event.created_at ?? Math.floor(Date.now() / 1000),
			donation,
		};
	}, [event, pubkey, profile]);

	return <PlatformChatMessage message={message} />;
};

export default NostrChatMessageAdapter;
