"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import type { UnifiedChatMessage } from "@/lib/chat/types";

const MAX_MESSAGES = 200;
const RECONNECT_DELAY = 5000;

export function usePlatformChat(npub: string | undefined): {
	messages: UnifiedChatMessage[];
	isConnected: boolean;
	error: string | null;
} {
	const [messages, setMessages] = useState<UnifiedChatMessage[]>([]);
	const [isConnected, setIsConnected] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const eventSourceRef = useRef<EventSource | null>(null);
	const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

	const cleanup = useCallback(() => {
		if (eventSourceRef.current) {
			eventSourceRef.current.close();
			eventSourceRef.current = null;
		}
		if (reconnectTimerRef.current) {
			clearTimeout(reconnectTimerRef.current);
			reconnectTimerRef.current = null;
		}
	}, []);

	useEffect(() => {
		if (!npub) {
			cleanup();
			setIsConnected(false);
			setMessages([]);
			return;
		}

		const connect = () => {
			cleanup();

			const es = new EventSource(`/api/chat/stream?npub=${encodeURIComponent(npub)}`);
			eventSourceRef.current = es;

			es.onopen = () => {
				setIsConnected(true);
				setError(null);
			};

			es.onmessage = (event) => {
				try {
					const msg = JSON.parse(event.data) as UnifiedChatMessage;
					setMessages((prev) => {
						const exists = prev.some((m) => m.id === msg.id);
						if (exists) return prev;
						const updated = [...prev, msg];
						// Trim to max messages, keeping the newest
						if (updated.length > MAX_MESSAGES) {
							return updated.slice(updated.length - MAX_MESSAGES);
						}
						return updated;
					});
				} catch (e) {
					console.warn("Failed to parse SSE message:", e);
				}
			};

			es.onerror = () => {
				setIsConnected(false);
				setError("Chat connection lost. Reconnecting…");
				es.close();
				eventSourceRef.current = null;
				reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY);
			};
		};

		connect();

		return cleanup;
	}, [npub, cleanup]);

	return { messages, isConnected, error };
}
