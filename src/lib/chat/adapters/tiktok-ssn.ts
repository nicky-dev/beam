import { io, type Socket } from "socket.io-client";
import type { UnifiedChatMessage } from "../types";

const SSN_SERVER = "https://io.socialstream.ninja";

/**
 * Social Stream Ninja message format.
 * The SSN extension captures chat from platform web pages and forwards
 * messages through its Socket.IO relay server.
 */
interface SSNMessage {
	chatname?: string;
	chatmessage?: string;
	chatimg?: string;
	type?: string;
	sourceType?: string;
	/** Unique message identifier from SSN */
	id?: string;
	tid?: string;
	/** Unix ms timestamp */
	timestamp?: number;
	/** Donation/superchat amount */
	chatdonation?: string;
	/** Membership info */
	chatmembership?: string;
}

function ssnToUnified(msg: SSNMessage): UnifiedChatMessage | null {
	if (!msg.chatmessage && !msg.chatdonation) return null;

	const id = `ssn-tiktok-${msg.id || msg.tid || Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

	return {
		id,
		source: "tiktok",
		author: {
			id: msg.tid || msg.chatname || "unknown",
			name: msg.chatname || "TikTok User",
			avatar: msg.chatimg,
		},
		content: msg.chatmessage || "",
		timestamp: msg.timestamp ? Math.floor(msg.timestamp / 1000) : Math.floor(Date.now() / 1000),
		...(msg.chatdonation
			? {
					donation: {
						amount: msg.chatdonation,
						currency: "coins",
					},
				}
			: {}),
	};
}

export interface SSNConnection {
	socket: Socket;
	disconnect: () => void;
}

/**
 * Connect to Social Stream Ninja's relay server and listen for TikTok chat messages.
 * Returns a connection handle that can be cleaned up when the SSE stream ends.
 */
export function connectToSSN(
	sessionId: string,
	onMessage: (msg: UnifiedChatMessage) => void,
): SSNConnection {
	const socket = io(SSN_SERVER, {
		transports: ["websocket"],
		reconnection: true,
		reconnectionAttempts: 10,
		reconnectionDelay: 3000,
	});

	socket.on("connect", () => {
		// Join the SSN room for this session
		socket.emit("join", sessionId);
		console.log(`[chat/tiktok-ssn] Connected to SSN session: ${sessionId}`);
	});

	socket.on("chat", (data: SSNMessage) => {
		// Only forward TikTok messages (SSN captures all platforms)
		const msgType = (data.type || data.sourceType || "").toLowerCase();
		if (msgType !== "tiktok") return;

		const unified = ssnToUnified(data);
		if (unified) {
			onMessage(unified);
		}
	});

	socket.on("disconnect", (reason) => {
		console.log(`[chat/tiktok-ssn] Disconnected from SSN: ${reason}`);
	});

	socket.on("connect_error", (err) => {
		console.warn(`[chat/tiktok-ssn] Connection error: ${err.message}`);
	});

	return {
		socket,
		disconnect: () => {
			socket.disconnect();
		},
	};
}
