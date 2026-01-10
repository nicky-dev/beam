"use client";

import { useEffect, useMemo } from "react";
import { useSubscription } from "nostr-hooks";
import { Box, Icon, Typography } from "@mui/material";
import LogNostr from "@/component/LogoNostr";
import { NDKEvent } from "@nostr-dev-kit/ndk";

interface ViewersWidgetProps {
	liveInfo: NDKEvent | null | undefined;
}

export default function ViewersWidget({ liveInfo }: ViewersWidgetProps) {
	const liveId = useMemo(() => liveInfo?.deduplicationKey(), [liveInfo]);
	const subId = useMemo(() => "viewers-counter-widget-" + liveId, [liveId]);
	const { createSubscription, removeSubscription, events } =
		useSubscription(subId);

	useEffect(() => {
		if (!liveInfo) return;
		const dValue = liveInfo.tagValue("d");
		if (!dValue) return;
		const filters = [
			{
				limit: 1,
				kinds: [liveInfo.kind],
				"#d": [dValue],
			},
		];
		createSubscription({ filters, replaceOlderReplaceableEvents: true });
		return () => {
			removeSubscription();
		};
	}, [liveInfo, createSubscription, removeSubscription]);

	const uniqueViewersCount = useMemo(() => {
		const event = events?.[0];
		if (!event) {
			return 0;
		}
		if (event.tagValue("status") !== "live") {
			return 0;
		}
		const viewers = Number.parseInt(event.tagValue("current_participants") || "0", 10);
		return Number.isNaN(viewers) ? 0 : viewers.toLocaleString();
	}, [events]);

	return (
		<Box
			className="container"
			sx={{
				height: "100%",
				color: "white",
				display: "flex",
				alignItems: "center",
				justifyContent: "flex-start",
				gap: 0.5,
				overflow: "hidden",
				textShadow: "2px 2px 4px rgba(0,0,0,0.8), 0px 0px 8px rgba(0,0,0,0.5)",
			}}
		>
			<Icon className="icon" sx={{ fontSize: "100vh" }}>
				<LogNostr />
			</Icon>
			<Typography
				className="viewer"
				variant="h6"
				sx={{
					color: "white",
					fontWeight: "bold",
					fontSize: "60vh",
				}}
			>
				{uniqueViewersCount}
			</Typography>
		</Box>
	);
}
