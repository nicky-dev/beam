"use client";

import * as React from "react";
import { useRealtimeProfile } from "nostr-hooks"; // ต้องแน่ใจว่า useNdk สามารถเข้าถึง NDK instance ได้
import { ListItem, ListItemText, Typography, Box, Avatar } from "@mui/material";
import { nip19 } from "nostr-tools";

interface ZapperStats {
	totalSats: number;
	pubkey: string;
}

interface TopZapperItemProps {
	zapper: ZapperStats;
}

export default function TopZapperItem({ zapper }: TopZapperItemProps) {
	const { profile } = useRealtimeProfile(zapper.pubkey);

	const senderDisplayName = React.useMemo(
		() =>
			profile?.displayName ||
			profile?.name ||
			nip19.npubEncode(zapper.pubkey).substring(5, 13),
		[profile?.displayName, profile?.name, zapper.pubkey]
	);

	const pubkeyColor = React.useMemo(
		() => `#${zapper.pubkey?.substring(0, 6)}`,
		[zapper.pubkey]
	);

	return (
		<ListItem key={zapper.pubkey} sx={{ paddingY: 0.5 }}>
			<ListItemText
				primary={
					<Box sx={{ display: "flex", alignItems: "center" }}>
						{profile?.picture ? (
							<Avatar
								src={profile?.picture}
								alt={senderDisplayName}
								sx={{
									width: 24,
									height: 24,
									bgcolor: pubkeyColor,
									mr: 1,
								}}
							/>
						) : (
							<Avatar
								sx={{
									width: 24,
									height: 24,
									bgcolor: pubkeyColor,
									mr: 1,
								}}
							>
								{senderDisplayName[0]?.toLocaleUpperCase() || "?"}
							</Avatar>
						)}
						<Typography variant="body1" sx={{ fontWeight: "bold" }}>
							{senderDisplayName}
						</Typography>
					</Box>
				}
				secondary={
					<Typography variant="body2" sx={{ color: "lightgreen" }}>
						⚡ {zapper.totalSats.toLocaleString()} sats
					</Typography>
				}
			/>
		</ListItem>
	);
}
