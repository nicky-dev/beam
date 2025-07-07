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
		if (!events || events.length === 0) {
			return 0;
		}
		// ดึงค่า 'current_participants' จากเหตุการณ์ล่าสุด
		// แปลงเป็นตัวเลข หากไม่มีค่า ให้เป็น 0
		const viewers = parseInt(
			events[0]?.tagValue("current_participants") || "0",
			10
		);
		return isNaN(viewers) ? 0 : viewers.toLocaleString(); // ตรวจสอบอีกครั้งเพื่อความชัวร์
	}, [events]); // คำนวณใหม่เมื่อ events มีการเปลี่ยนแปลง

	return (
		<Box
			sx={{
				color: "white",
				display: "flex",
				alignItems: "center", // จัดแนวตั้งกึ่งกลาง
				justifyContent: "flex-start", // จัดแนวนอนกึ่งกลาง
				gap: 0.5, // เพิ่มช่องว่างระหว่างโลโก้กับข้อความ
				overflow: "hidden", // ซ่อนส่วนที่เกินออกไป
				textShadow: "2px 2px 4px rgba(0,0,0,0.8), 0px 0px 8px rgba(0,0,0,0.5)", // เงาเข้มขึ้น อ่านง่ายขึ้น
			}}
		>
			<Icon sx={{ fontSize: "100vh" }}>
				<LogNostr />
			</Icon>
			<Typography
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
