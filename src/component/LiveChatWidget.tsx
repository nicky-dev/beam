"use client";
import * as React from "react";
import { useSubscription } from "nostr-hooks";
import { NDKKind } from "@nostr-dev-kit/ndk";
import { Box } from "@mui/material";
import { usePlatformChat } from "@/hook/usePlatformChat";
import NostrChatMessageAdapter from "@/component/NostrChatMessageAdapter";
import PlatformChatMessage from "@/component/PlatformChatMessage";
import type { UnifiedChatMessage } from "@/lib/chat/types";

interface LiveChatWidgetProps {
	liveId: string;
	now?: boolean;
	npub?: string;
}

export default function LiveChatWidget({
	liveId,
	now = true,
	npub,
}: LiveChatWidgetProps) {
	const chatBoxRef = React.useRef<HTMLElement>(null);
	const timeoutRef = React.useRef<NodeJS.Timeout>(null);

	const subId = React.useMemo(() => "live-chat-widget-" + liveId, [liveId]);
	const { createSubscription, events, removeSubscription } =
		useSubscription(subId);

	const { messages: platformMessages } = usePlatformChat(npub);

	React.useEffect(() => {
		if (!liveId) return;
		const filters = [
			{
				kinds: [1311 as NDKKind],
				"#a": [liveId],
				...(now ? { since: Math.floor(Date.now() / 1000) } : { limit: 20 }),
			},
			{
				kinds: [NDKKind.Zap],
				"#a": [liveId],
				...(now ? { since: Math.floor(Date.now() / 1000) } : { limit: 20 }),
			},
		];
		createSubscription({ filters });
		return () => {
			removeSubscription();
		};
	}, [now, liveId, createSubscription, removeSubscription]);

	// Sort platform messages for interleaved rendering
	const sortedPlatformMessages = React.useMemo(
		() => [...platformMessages].sort((a, b) => a.timestamp - b.timestamp),
		[platformMessages],
	);

	// Merge Nostr events and platform messages by timestamp for scroll tracking
	const totalMessageCount = (events?.length ?? 0) + sortedPlatformMessages.length;

	React.useEffect(() => {
		if (totalMessageCount <= 0) return;
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
		timeoutRef.current = setTimeout(() => {
			if (chatBoxRef.current) {
				chatBoxRef.current.scrollIntoView({
					behavior: "smooth",
					inline: "end",
					block: "end",
				});
			}
		}, 200);
	}, [totalMessageCount]);

	// Build a merged timeline of nostr events and platform messages
	const mergedItems = React.useMemo(() => {
		const nostrItems: { type: "nostr"; event: import("@nostr-dev-kit/ndk").NDKEvent; ts: number }[] = (events ?? []).map(
			(e) => ({ type: "nostr" as const, event: e, ts: e.created_at ?? 0 }),
		);
		const platformItems: { type: "platform"; message: UnifiedChatMessage; ts: number }[] = sortedPlatformMessages.map(
			(m) => ({ type: "platform" as const, message: m, ts: m.timestamp }),
		);

		return [...nostrItems, ...platformItems].sort((a, b) => a.ts - b.ts);
	}, [events, sortedPlatformMessages]);

	return (
		<Box
			className="chat"
			ref={chatBoxRef}
			sx={{
				height: "100%",
				overflowY: "auto",
				borderRadius: "0px",
				backgroundColor: "rgba(0, 0, 0, 0)",
				display: "flex",
				justifyContent: "flex-end",
				flexDirection: "column",

				"&::-webkit-scrollbar": {
					width: "8px",
				},
				"&::-webkit-scrollbar-track": {
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
			{mergedItems.map((item) =>
				item.type === "nostr" ? (
					<NostrChatMessageAdapter key={item.event.id} event={item.event} />
				) : (
					<PlatformChatMessage key={item.message.id} message={item.message} />
				),
			)}
		</Box>
	);
}
