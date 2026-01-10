"use client";

import * as React from "react";
import { useEffect, useMemo } from "react";
import { useSubscription } from "nostr-hooks";
import { Box, Icon, Typography } from "@mui/material";
import { useWidgetContext } from "@/hook/widget";
import LogNostr from "@/component/LogoNostr";

export default function ViewersCounterWidget() {
	const { liveId, liveInfo } = useWidgetContext();

	const subId = useMemo(() => "viewers-counter-widget-" + liveId, [liveId]);
	const { createSubscription, removeSubscription, events } =
		useSubscription(subId);

	useEffect(() => {
		if (!liveInfo) return;
		const filters = [
			{
				limit: 1,
				kinds: [liveInfo.kind],
				"#d": [liveInfo.tagValue("d")!],
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
		// ดึงค่า 'current_participants' จากเหตุการณ์ล่าสุด
		// แปลงเป็นตัวเลข หากไม่มีค่า ให้เป็น 0
		const viewers = parseInt(event.tagValue("current_participants") || "0", 10);
		return isNaN(viewers) ? 0 : viewers;
	}, [events]); // คำนวณใหม่เมื่อ events มีการเปลี่ยนแปลง

	return (
		<Box
			className="container"
			sx={{
				width: "100%",
				height: "100%",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding: 1,
			}}
		>
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					gap: 1,
				}}
			>
				<Icon
					className="icon"
					sx={{
						fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" },
						color: "white",
						filter: "drop-shadow(2px 2px 4px rgba(0,0,0,0.8))",
						display: "flex",
						alignItems: "center",
					}}
				>
					<LogNostr />
				</Icon>
				<Typography
					className="viewer"
					sx={{
						color: "white",
						fontWeight: "bold",
						fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" },
						textShadow: "2px 2px 4px rgba(0,0,0,0.8), 0px 0px 8px rgba(0,0,0,0.5)",
						lineHeight: 1,
					}}
				>
					{uniqueViewersCount.toLocaleString()}
				</Typography>
			</Box>
		</Box>
	);
}
