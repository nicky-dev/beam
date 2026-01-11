import React, { useMemo } from "react";
import { Box, Typography, Paper, Avatar } from "@mui/material";
import { NDKEvent, NDKKind, zapInvoiceFromEvent } from "@nostr-dev-kit/ndk"; // <--- เพิ่ม NDKKind
import { useRealtimeProfile } from "nostr-hooks";
import { nip19 } from "nostr-tools";
import { useEventId } from "@/hook/nostr-event";
import TextNote from "./TextNote";
import ReplyMessage from "./ReplyMessage";

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

	// --- ตรรกะสำหรับ Reply ---
	const repliedToEventId = useMemo(
		() =>
			message.tags.find(
				(tag) => tag[0] === "e" && (tag[3] === "reply" || tag[3] === "root")
			)?.[1],
		[message.tags]
	);

	const repliedEvent = useEventId(repliedToEventId || "");

	// สร้าง donation string สำหรับ Social Stream Ninja
	const donationAmount = useMemo(() => {
		if (message.kind !== NDKKind.Zap || !invoice?.amount) return undefined;
		return `${(Number(invoice.amount) / 1000).toLocaleString()} sats`;
	}, [message.kind, invoice?.amount]);

	// สร้าง zap display text
	const zapDisplayText = useMemo(() => {
		if (message.kind !== NDKKind.Zap) return "";

		const amount = invoice?.amount;
		const comment = invoice?.comment;
		const displayAmount = amount
			? `${(Number(amount) / 1000).toLocaleString()} sats`
			: "Zap";
		const displayNote = message.content || comment || "";

		return displayNote ? `${displayAmount}: ${displayNote}` : displayAmount;
	}, [message.kind, message.content, invoice]);

	return (
		<Paper
			className={
				message.kind === NDKKind.Zap
					? "chat-message zap"
					: "chat-message message"
			}
			// Social Stream Ninja data attributes
			data-chatname={senderDisplayName}
			data-chatmessage={message.content}
			data-chatimg={profile?.picture || ""}
			data-type="nostr"
			data-has-donation={donationAmount}
			data-userid={pubkey}
			data-timestamp={message.created_at}
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
					className="avatar chatimg"
					src={profile?.picture}
					alt={senderDisplayName}
					sx={{ width: 24, height: 24, bgcolor: pubkeyColor, flexShrink: 0 }}
				/>
			) : (
				<Avatar
					className="avatar chatimg"
					sx={{ width: 24, height: 24, bgcolor: pubkeyColor, flexShrink: 0 }}
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
						className="username chat-username author"
						data-username={senderDisplayName}
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
				{!!repliedEvent && <ReplyMessage message={repliedEvent} />}
				{/* เนื้อหาข้อความ - จัดการสำหรับข้อความทั่วไปและ Zap */}
				{message.kind === NDKKind.Zap ? (
					<Typography
						variant="body1"
						className="message-text chat-text content donation"
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
						{zapDisplayText}
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
						<TextNote content={message.content} />
					</Typography>
				)}
			</Box>
		</Paper>
	);
};

export default ChatMessage;
