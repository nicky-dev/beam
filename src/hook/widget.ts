import { NDKEvent } from "@nostr-dev-kit/ndk";
import React from "react";

export const WidgetContext = React.createContext<{
	liveInfo?: NDKEvent | null;
	liveId?: string;
	pubkey?: string;
}>({
	liveInfo: undefined,
	liveId: undefined,
	pubkey: undefined,
});

export function useWidgetContext() {
	return React.useContext(WidgetContext);
}
