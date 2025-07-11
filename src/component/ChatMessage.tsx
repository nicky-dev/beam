// components/ChatMessage.tsx
import React, { useMemo } from "react";
import { Box, Typography, Paper, Avatar } from "@mui/material";
import { NDKEvent, NDKKind, zapInvoiceFromEvent } from "@nostr-dev-kit/ndk"; // <--- เพิ่ม NDKKind
import { useRealtimeProfile } from "nostr-hooks";
import { nip19 } from "nostr-tools";

interface ChatMessageProps {
	message: NDKEvent;
	// isCurrentUser: boolean; // ยังไม่ได้ใช้ แต่ถ้าต้องการแยกฝั่ง ควรนำมาใช้
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
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

	const invoice = useMemo(
		() =>
			message.kind === NDKKind.Zap ? zapInvoiceFromEvent(message) : undefined,
		[message]
	);

	return (
		<Paper
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
			{profile?.picture ? (
				<Avatar
					src={profile?.picture}
					alt={senderDisplayName}
					sx={{ width: 32, height: 32, bgcolor: pubkeyColor, flexShrink: 0 }}
				/>
			) : (
				<Avatar
					sx={{ width: 32, height: 32, bgcolor: pubkeyColor, flexShrink: 0 }}
				>
					{senderDisplayName[0]?.toLocaleUpperCase() || "?"}
				</Avatar>
			)}

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
					<Typography
						variant="subtitle1"
						sx={{
							fontWeight: "bold",
							color: "#e0f2f7",
							textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
							whiteSpace: "nowrap",
							overflow: "hidden",
							textOverflow: "ellipsis",
							flexShrink: 0,
							marginRight: "8px",
						}}
					>
						{senderDisplayName}
					</Typography>
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

				{/* เนื้อหาข้อความ - จัดการสำหรับข้อความทั่วไปและ Zap */}
				{message.kind === NDKKind.Zap ? (
					<Typography
						variant="body1"
						sx={{
							margin: 0,
							color: "#aaffaa", // สีเขียวอ่อนสำหรับ Zap เพื่อให้โดดเด่น
							textShadow: "1px 1px 3px rgba(0,0,0,0.7)",
							lineHeight: 1.4,
							overflowWrap: "break-word",
						}}
					>
						<span role="img" aria-label="zap">
							⚡️
						</span>{" "}
						{(() => {
							let displayAmount = "Zap";
							let displayNote = message.content || ""; // ข้อความ Zap จาก content ของ 9735 event

							try {
								if (invoice) {
									const { amount, comment } = invoice;
									// ค้นหา amount จาก tags ของ zapRequest (kind 9734 event)
									if (amount) {
										displayAmount = `${(
											Number(amount) / 1000
										).toLocaleString()} sats`;
									}
									// หาก content ของ 9735 event ไม่มีข้อความ ให้ใช้ข้อความจาก content ของ zapRequest (kind 9734)
									if (!displayNote && comment) {
										displayNote = comment;
									}
								}
							} catch (e) {
								console.error("Failed to parse zap description or amount:", e);
								// หากเกิดข้อผิดพลาด ให้ใช้ค่าเริ่มต้น
							}

							return `${displayAmount}${displayNote ? `: ${displayNote}` : ""}`;
						})()}
					</Typography>
				) : (
					<Typography
						variant="body1"
						sx={{
							margin: 0,
							color: "#ffffff",
							textShadow: "1px 1px 3px rgba(0,0,0,0.7)",
							lineHeight: 1.4,
							overflowWrap: "break-word",
						}}
					>
						{message.content}
					</Typography>
				)}
			</Box>
		</Paper>
	);
};

export default ChatMessage;
