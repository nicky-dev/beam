// components/ChatMessageList.tsx
import React from "react";
import ChatMessage from "./ChatMessage";
import { NDKEvent } from "@nostr-dev-kit/ndk";

interface ChatMessageListProps {
	messages: NDKEvent[];
	currentUserPubkey?: string;
}

const ChatMessageList: React.FC<ChatMessageListProps> = ({ messages }) => {
	return messages.map((message) => (
		<ChatMessage key={message.id} message={message} />
	));
};

export default ChatMessageList;
