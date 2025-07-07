"use client";
import * as React from "react";
import { useSubscription } from "nostr-hooks";
import { NDKKind } from "@nostr-dev-kit/ndk";
import ChatMessageList from "@/component/ChatMessagesList";
import { Box } from "@mui/material";
import { useWidgetContext } from "@/hook/widget";

export default function LiveChat() {
	const { liveId } = useWidgetContext();
	const chatBoxRef = React.useRef<HTMLElement>(null); // สร้าง ref สำหรับอ้างอิง Box element
	const timeoutRef = React.useRef<NodeJS.Timeout>(null); // สร้าง ref สำหรับอ้างอิง Box element

	const subId = React.useMemo(() => "live-chat-" + liveId, [liveId]);
	const { createSubscription, events, removeSubscription } =
		useSubscription(subId);

	React.useEffect(() => {
		if (!liveId) return;
		// เพิ่ม NDKKind.Zap (9735) เข้าไปใน filters เพื่อ query zap events ด้วย
		const filters = [
			{ kinds: [1311 as NDKKind], "#a": [liveId], limit: 20 }, // Live Chat Messages
			{ kinds: [NDKKind.Zap], "#a": [liveId], limit: 20 }, // Zap Events targeting this live activity
		];
		createSubscription({ filters });
		return () => {
			removeSubscription();
		};
	}, [liveId, createSubscription, removeSubscription]);

	// เพิ่ม useEffect นี้เข้ามา เพื่อเลื่อน scroll ลงล่างสุดเมื่อ events มีการเปลี่ยนแปลง (มีข้อความใหม่เข้ามา)
	React.useEffect(() => {
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
			ref={chatBoxRef}
			sx={{
				overflowY: "auto",
				borderRadius: "0px",
				backgroundColor: "rgba(0, 0, 0, 0)",
				display: "flex",
				justifyContent: "flex-end",
				flexDirection: "column",

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
