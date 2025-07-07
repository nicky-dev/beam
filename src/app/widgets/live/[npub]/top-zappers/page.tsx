"use client";

import * as React from "react";
import { useEffect, useMemo } from "react";
import { useSubscription } from "nostr-hooks";
import { NDKKind, zapInvoiceFromEvent } from "@nostr-dev-kit/ndk";
import { Box, Typography, List } from "@mui/material";
import { useWidgetContext } from "@/hook/widget";
import TopZapperItem from "@/component/TopZapperItem";

interface ZapperStats {
	totalSats: number;
}

export default function TopZapperWidget() {
	const { liveId, pubkey } = useWidgetContext();

	const subId = useMemo(() => "top-zappers-widget-" + liveId, [liveId]);
	const { createSubscription, removeSubscription, events } =
		useSubscription(subId);

	// Effect to initialize the subscription
	useEffect(() => {
		if (!pubkey) return;
		const since = new Date();
		since.setDate(1);
		since.setMonth(since.getMonth() - 1);
		const filters = [
			{
				kinds: [NDKKind.Zap],
				// "#a": [liveId],
				"#p": [pubkey],
				since: since.getTime() / 1000,
			},
		];
		createSubscription({ filters });
		return () => {
			removeSubscription();
		};
	}, [pubkey, createSubscription, removeSubscription]);

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

	// Sort zappers to get the top list
	const topZappers = useMemo(() => {
		return Object.entries(zappers || {})
			.map(([pubkey, stats]) => ({
				pubkey,
				totalSats: stats.totalSats,
			}))
			.sort((a, b) => b.totalSats - a.totalSats) // Sort descending by totalSats
			.slice(0, 5); // Get top 10
	}, [zappers]);

	return (
		<Box
			sx={{
				padding: 2,
				backgroundColor: "rgba(255, 255, 255, 0.05)",
				borderRadius: "8px",
				color: "white",
				minWidth: "250px",
				maxHeight: "400px", // Example max height
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
				⭐ Top Supporter Since Last Month ⭐
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
