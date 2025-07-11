import React, { useMemo } from "react";
import { Box, Typography, Paper, Avatar } from "@mui/material";
import { NDKEvent, NDKKind, zapInvoiceFromEvent } from "@nostr-dev-kit/ndk"; // <--- เพิ่ม NDKKind
import { useRealtimeProfile } from "nostr-hooks";
import { nip19 } from "nostr-tools";
import TextNote from "./TextNote";

interface ReplyMessageProps {
	message: NDKEvent;
	// isCurrentUser: boolean; // ยังไม่ได้ใช้ แต่ถ้าต้องการแยกฝั่ง ควรนำมาใช้
}

const ReplyMessage: React.FC<ReplyMessageProps> = ({ message }) => {
	const pubkey = useMemo(
		() =>
			message.kind === NDKKind.Zap
				? zapInvoiceFromEvent(message)?.zappee
				: message.pubkey,
		[message]
	);

	const { profile } = useRealtimeProfile(pubkey);
	const npub = useMemo(() => nip19.npubEncode(pubkey!), [pubkey]);
	const senderDisplayName = useMemo(
		() => profile?.displayName || profile?.name || npub.substring(0, 8),
		[profile?.displayName, profile?.name, npub]
	);
	const pubkeyColor = useMemo(() => `#${pubkey?.substring(0, 6)}`, [pubkey]);

	const time = useMemo(
		() =>
			new Date(Number(message.created_at) * 1000)
				.toTimeString()
				.split(":")
				.slice(0, 2)
				.join(":"),
		[message.created_at]
	);

	return (
		<Paper
			elevation={0}
			sx={{
				padding: 1,
				borderRadius: "12px",
				backgroundColor: "rgba(30, 30, 30)",
				backdropFilter: "blur(3px)",
				WebkitBackdropFilter: "blur(3px)",
				display: "flex",
				alignItems: "flex-start",
				gap: "8px",
				fontStyle: "italic",
				opacity: 0.8,
			}}
		>
			{/* Box นี้จะควบคุมการแสดงผลของ ชื่อผู้ส่ง, เวลา, และเนื้อหาข้อความ */}
			<Box sx={{ flexGrow: 1, minWidth: 0 }}>
				{/* ส่วนหัว: ชื่อผู้ส่ง และ เวลา - จะอยู่บรรทัดเดียวกัน */}
				<Box
					sx={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: "4px",
					}}
				>
					<Box
						sx={{
							display: "flex",
							alignItems: "center",
						}}
					>
						{profile?.picture ? (
							<Avatar
								src={profile?.picture}
								alt={senderDisplayName}
								sx={{
									width: 24,
									height: 24,
									bgcolor: pubkeyColor,
									flexShrink: 0,
								}}
							/>
						) : (
							<Avatar
								sx={{
									width: 24,
									height: 24,
									bgcolor: pubkeyColor,
									flexShrink: 0,
								}}
							>
								{senderDisplayName[0]?.toLocaleUpperCase() || "?"}
							</Avatar>
						)}
						<Typography
							variant="subtitle2"
							sx={{
								fontWeight: "bold",
								color: "#e0f2f7",
								textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
								whiteSpace: "nowrap",
								overflow: "hidden",
								textOverflow: "ellipsis",
								flexShrink: 0,
								ml: 1,
							}}
						>
							{senderDisplayName}
						</Typography>
					</Box>
					<Typography
						variant="caption"
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
				<Box
					sx={{
						margin: 0,
						fontSize: "0.875rem",
						overflowWrap: "break-word",
					}}
				>
					<TextNote content={message.content} />
				</Box>
			</Box>
		</Paper>
	);
};

export default ReplyMessage;
