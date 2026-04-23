// components/ChatMessageList.tsx
import React from "react";
import ChatMessage from "./ChatMessage";
import PlatformChatMessage from "./PlatformChatMessage";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import type { UnifiedChatMessage } from "@/lib/chat/types";

interface ChatMessageListProps {
	messages: NDKEvent[];
	unifiedMessages?: UnifiedChatMessage[];
	currentUserPubkey?: string;
}

const ChatMessageList: React.FC<ChatMessageListProps> = ({ messages, unifiedMessages }) => {
	return (
		<>
			{messages.map((message) => (
				<ChatMessage key={message.id} message={message} />
			))}
			{unifiedMessages?.map((message) => (
				<PlatformChatMessage key={message.id} message={message} />
			))}
		</>
	);
};

export default ChatMessageList;
