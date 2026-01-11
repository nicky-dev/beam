"use client";
import * as React from "react";
import { useSubscription } from "nostr-hooks";
import { NDKKind } from "@nostr-dev-kit/ndk";
import ChatMessageList from "@/component/ChatMessagesList";
import { Box } from "@mui/material";

interface LiveChatWidgetProps {
	liveId: string;
	now?: boolean;
}

export default function LiveChatWidget({
	liveId,
	now = true,
}: LiveChatWidgetProps) {
	const chatBoxRef = React.useRef<HTMLElement>(null);
	const timeoutRef = React.useRef<NodeJS.Timeout>(null);

	const subId = React.useMemo(() => "live-chat-widget-" + liveId, [liveId]);
	const { createSubscription, events, removeSubscription } =
		useSubscription(subId);

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

	React.useEffect(() => {
		if (!events || events.length <= 0) return;
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
	}, [events]);

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
			{events ? <ChatMessageList messages={events} /> : null}
		</Box>
	);
}
