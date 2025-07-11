"use client";
import * as React from "react";
import { useNdk } from "nostr-hooks";
import { useQuery } from "@tanstack/react-query";
import NDK, { NDKKind } from "@nostr-dev-kit/ndk";
import NDKCacheAdapterDexie from "@nostr-dev-kit/ndk-cache-dexie";
import { nip19, nip05 } from "nostr-tools";
import { WidgetContext } from "@/hook/widget";

const relays = [
	"wss://relay.damus.io",
	"wss://relay.nostr.band",
	"wss://nos.lol",
	"wss://nostr.land",
	"wss://purplerelay.com",
];

export default function WidgetLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ npub: string }>;
}) {
	const { npub } = React.use(params);
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
			return ndk.fetchEvent([
				{
					limit: 1,
					kinds: [30311 as NDKKind],
					"#p": [pubkey],
				},
				{
					limit: 1,
					kinds: [30311 as NDKKind],
					authors: [pubkey],
				},
			]);
		},
	});

	const liveId = React.useMemo(
		() => liveInfo.data?.deduplicationKey(),
		[liveInfo.data]
	);

	return (
		<WidgetContext.Provider
			value={{ liveId, liveInfo: liveInfo.data, pubkey: pubkeyQuery.data }}
		>
			{children}
		</WidgetContext.Provider>
	);
}
