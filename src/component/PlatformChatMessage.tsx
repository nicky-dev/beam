"use client";
import React, { useMemo } from "react";
import { Box, Typography, Paper, Avatar, Chip } from "@mui/material";
import YouTubeIcon from "@mui/icons-material/YouTube";
import VideogameAssetIcon from "@mui/icons-material/VideogameAsset";
import FacebookIcon from "@mui/icons-material/Facebook";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import ElectricBoltIcon from "@mui/icons-material/ElectricBolt";
import type { UnifiedChatMessage } from "@/lib/chat/types";
import TextNote from "./TextNote";

interface PlatformChatMessageProps {
	message: UnifiedChatMessage;
}

function getPlatformBadge(source: UnifiedChatMessage["source"]) {
	switch (source) {
		case "nostr":
			return <Chip icon={<ElectricBoltIcon />} label="Nostr" size="small" sx={{ bgcolor: "#7B1FA2", color: "#fff", height: 20, "& .MuiChip-label": { px: 0.5, fontSize: "0.65rem" }, "& .MuiChip-icon": { fontSize: "0.75rem", color: "#fff" } }} />;
		case "youtube":
			return <Chip icon={<YouTubeIcon />} label="YT" size="small" sx={{ bgcolor: "#FF0000", color: "#fff", height: 20, "& .MuiChip-label": { px: 0.5, fontSize: "0.65rem" }, "& .MuiChip-icon": { fontSize: "0.75rem", color: "#fff" } }} />;
		case "twitch":
			return <Chip icon={<VideogameAssetIcon />} label="TTV" size="small" sx={{ bgcolor: "#9146FF", color: "#fff", height: 20, "& .MuiChip-label": { px: 0.5, fontSize: "0.65rem" }, "& .MuiChip-icon": { fontSize: "0.75rem", color: "#fff" } }} />;
		case "facebook":
			return <Chip icon={<FacebookIcon />} label="FB" size="small" sx={{ bgcolor: "#1877F2", color: "#fff", height: 20, "& .MuiChip-label": { px: 0.5, fontSize: "0.65rem" }, "& .MuiChip-icon": { fontSize: "0.75rem", color: "#fff" } }} />;
		case "tiktok":
			return <Chip icon={<MusicNoteIcon />} label="TT" size="small" sx={{ bgcolor: "#EE1D52", color: "#fff", height: 20, "& .MuiChip-label": { px: 0.5, fontSize: "0.65rem" }, "& .MuiChip-icon": { fontSize: "0.75rem", color: "#fff" } }} />;
	}
}

const PlatformChatMessage: React.FC<PlatformChatMessageProps> = ({ message }) => {
	const { author, content, timestamp, donation, source } = message;

	const time = useMemo(
		() =>
			new Date(timestamp * 1000)
				.toTimeString()
				.split(":")
				.slice(0, 2)
				.join(":"),
		[timestamp],
	);

	const avatarColor = useMemo(() => `#${author.id.substring(0, 6)}`, [author.id]);

	return (
		<Paper
			className={donation ? "chat-message zap" : "chat-message message"}
			data-chatname={author.name}
			data-chatmessage={content}
			data-chatimg={author.avatar || ""}
			data-type={source}
			data-has-donation={donation?.amount}
			data-userid={author.id}
			data-timestamp={timestamp}
			elevation={0}
			sx={{
				marginBottom: "8px",
				padding: "8px 16px",
				borderRadius: "12px",
				backgroundColor: "rgba(30, 30, 30, 0.7)",
				maxWidth: "98%",
				marginLeft: "0",
				marginRight: "auto",
				backdropFilter: "blur(3px)",
				WebkitBackdropFilter: "blur(3px)",
				display: "flex",
				alignItems: "flex-start",
				gap: "12px",
			}}
		>
			{author.avatar ? (
				<Avatar
					className="avatar chatimg"
					src={author.avatar}
					alt={author.name}
					sx={{ width: 24, height: 24, bgcolor: avatarColor, flexShrink: 0 }}
				/>
			) : (
				<Avatar
					className="avatar chatimg"
					sx={{ width: 24, height: 24, bgcolor: avatarColor, flexShrink: 0 }}
				>
					{author.name[0]?.toLocaleUpperCase() || "?"}
				</Avatar>
			)}
			<Box sx={{ flexGrow: 1, minWidth: 0 }}>
				<Box
					sx={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: "4px",
						gap: "4px",
					}}
				>
					<Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0 }}>
						<Typography
							className="username chat-username author"
							data-username={author.name}
							variant="subtitle1"
							sx={{
								fontWeight: "bold",
								color: "#e0f2f7",
								textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
								whiteSpace: "nowrap",
								overflow: "hidden",
								textOverflow: "ellipsis",
								flexShrink: 1,
							}}
						>
							{author.name}
						</Typography>
						{getPlatformBadge(source)}
					</Box>
					<Typography
						variant="body2"
						sx={{
							color: "#bdbdbd",
							textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
							whiteSpace: "nowrap",
							flexShrink: 0,
						}}
					>
						{time}
					</Typography>
				</Box>
				{donation ? (
					<Typography
						variant="body1"
						className="message-text chat-text content donation"
						sx={{
							margin: 0,
							color: "#aaffaa",
							textShadow: "1px 1px 3px rgba(0,0,0,0.7)",
							lineHeight: 1.4,
							overflowWrap: "break-word",
						}}
					>
						<span role="img" aria-label="zap">
							⚡️
						</span>{" "}
						{donation.amount}: {content}
					</Typography>
				) : (
					<Typography
						variant="body1"
						className="message-text chat-text content message-content"
						sx={{
							margin: 0,
							color: "#ffffff",
							textShadow: "1px 1px 3px rgba(0,0,0,0.7)",
							lineHeight: 1.4,
							overflowWrap: "break-word",
						}}
					>
						{source === "nostr" ? <TextNote content={content} /> : content}
					</Typography>
				)}
			</Box>
		</Paper>
	);
};

export default PlatformChatMessage;
