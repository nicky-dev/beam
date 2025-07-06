"use client";
import * as React from "react";
import { useNdk, useSubscription } from "nostr-hooks";
import { useQuery } from "@tanstack/react-query";
import NDK, { NDKKind } from "@nostr-dev-kit/ndk";
import NDKCacheAdapterDexie from "@nostr-dev-kit/ndk-cache-dexie";
import { useParams } from "next/navigation";
import { nip19, nip05 } from "nostr-tools";
import ChatMessageList from "@/component/ChatMessagesList";
import { Box } from "@mui/material";

const relays = [
	"wss://relay.damus.io",
	"wss://relay.nostr.band",
	"wss://nos.lol",
];

export default function LiveChat() {
	const { npub } = useParams();
	const { ndk, initNdk } = useNdk();

	React.useEffect(() => {
		if (ndk) return;
		initNdk({
			cacheAdapter: new NDKCacheAdapterDexie(),
			explicitRelayUrls: relays,
		});
	}, [ndk, initNdk]);

	React.useEffect(() => {
		ndk?.connect();
	}, [ndk]);

	const pubkeyQuery = useQuery({
		queryKey: ["pubkey", npub],
		enabled: !!npub?.toString(),
		queryFn: ({ queryKey }) => {
			const val = queryKey[1]?.toString() || "";
			if (nip05.isNip05(val)) {
				return nip05.queryProfile(val)?.then((d) => d?.pubkey);
			}
			return nip19.decode(val).data.toString();
		},
	});

	const liveInfo = useQuery({
		queryKey: ["live-info", { ndk, pubkey: pubkeyQuery.data }],
		enabled: pubkeyQuery.isFetched && !!pubkeyQuery.data && !!ndk,
		queryFn: async ({ queryKey }) => {
			const { ndk, pubkey } = queryKey[1] as {
				ndk: NDK;
				pubkey: string;
			};
			return ndk.fetchEvent({
				limit: 1,
				kinds: [30311 as NDKKind],
				"#p": [pubkey],
			});
		},
	});

	const liveId = React.useMemo(
		() => liveInfo.data?.deduplicationKey(),
		[liveInfo.data]
	);

	const subId = React.useMemo(() => "live-chat-" + liveId, [liveId]);
	const { createSubscription, events, removeSubscription } =
		useSubscription(subId);

	React.useEffect(() => {
		if (!liveId) return;
		// เพิ่ม NDKKind.Zap (9735) เข้าไปใน filters เพื่อ query zap events ด้วย
		const filters = [
			{ kinds: [1311 as NDKKind], "#a": [liveId] }, // Live Chat Messages
			{ kinds: [NDKKind.Zap], "#a": [liveId] }, // Zap Events targeting this live activity
		];
		createSubscription({ filters });
		return () => removeSubscription();
	}, [liveId, createSubscription, removeSubscription]);

	return (
		<Box
			sx={{
				height: "100vh",
				width: "100vw",
				overflowY: "auto",
				borderRadius: "0px",
				backgroundColor: "rgba(0, 0, 0, 0)",
				display: "flex",
				justifyContent: "flex-end",
				flexDirection: "column",
				// ปรับแต่ง scrollbar สำหรับ WebKit browsers (Chrome, Edge, Safari, OBS)
				"&::-webkit-scrollbar": {
					width: "8px",
				},
				"&::-::-webkit-scrollbar-track": {
					backgroundColor: "rgba(0,0,0,0)",
				},
				"&::-webkit-scrollbar-thumb": {
					backgroundColor: "rgba(255, 255, 255, 0.3)",
					borderRadius: "4px",
				},
				"&::-webkit-scrollbar-thumb:hover": {
					backgroundColor: "rgba(255, 255, 255, 0.5)",
				},
			}}
		>
			{events ? <ChatMessageList messages={events} /> : null}
		</Box>
	);
}
