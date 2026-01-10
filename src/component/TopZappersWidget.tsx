"use client";

import { useEffect, useMemo } from "react";
import { useSubscription } from "nostr-hooks";
import { NDKKind, zapInvoiceFromEvent } from "@nostr-dev-kit/ndk";
import { Box, Typography, List } from "@mui/material";
import TopZapperItem from "@/component/TopZapperItem";

interface ZapperStats {
	totalSats: number;
}

interface TopZappersWidgetProps {
	liveId: string;
}

export default function TopZappersWidget({ liveId }: TopZappersWidgetProps) {
	const subId = useMemo(() => "top-zappers-widget-" + liveId, [liveId]);
	const { createSubscription, removeSubscription, events } =
		useSubscription(subId);

	useEffect(() => {
		if (!liveId) return;
		const filters = [
			{
				kinds: [NDKKind.Zap],
				"#a": [liveId],
			},
		];
		createSubscription({ filters });
		return () => {
			removeSubscription();
		};
	}, [liveId, createSubscription, removeSubscription]);

	const zappers = useMemo(() => {
		return events?.reduce((a, b) => {
			const { amount, zappee } = zapInvoiceFromEvent(b) || {};
			if (zappee) {
				if (!a[zappee]) {
					a[zappee] = { totalSats: 0 };
				}
				a[zappee].totalSats += (amount || 0) / 1000;
			}
			return a;
		}, {} as Record<string, ZapperStats>);
	}, [events]);

	const topZappers = useMemo(() => {
		return Object.entries(zappers || {})
			.map(([pubkey, stats]) => ({
				pubkey,
				totalSats: stats.totalSats,
			}))
			.sort((a, b) => b.totalSats - a.totalSats)
			.slice(0, 5);
	}, [zappers]);

	return (
		<Box
			sx={{
				height: "100%",
				padding: 2,
				backgroundColor: "rgba(255, 255, 255, 0.05)",
				borderRadius: "8px",
				color: "white",
				minWidth: "250px",
				overflowY: "auto",
				"&::-webkit-scrollbar": {
					width: "6px",
				},
				"&::-webkit-scrollbar-thumb": {
					backgroundColor: "rgba(255, 255, 255, 0.3)",
					borderRadius: "3px",
				},
			}}
		>
			<Typography variant="h6" gutterBottom sx={{ color: "white" }}>
				Top Zappers
			</Typography>
			{topZappers.length === 0 ? (
				<Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.7)" }}>
					No data.
				</Typography>
			) : (
				<List dense>
					{topZappers.map((zapper) => (
						<TopZapperItem key={zapper.pubkey} zapper={zapper} />
					))}
				</List>
			)}
		</Box>
	);
}
