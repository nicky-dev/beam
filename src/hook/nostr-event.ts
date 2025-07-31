import { NDKFilter } from "@nostr-dev-kit/ndk";
import { useSubscription } from "nostr-hooks";
import { useEffect } from "react";

export const useEventId = (eventId: string) => {
	const { createSubscription, removeSubscription, events } =
		useSubscription(eventId);
	useEffect(() => {
		if (!eventId) return;
		// สร้าง subscription เพื่อดึงข้อมูลของอีเวนต์ที่ถูก Reply ถึง
		createSubscription({
			filters: [{ ids: [eventId] }],
		});
		return () => {
			removeSubscription();
		};
	}, [eventId, createSubscription, removeSubscription]);
	return events?.[0];
};

export const useEvents = (filters: NDKFilter[]) => {
	const { createSubscription, removeSubscription, events } =
		useSubscription(undefined);
	useEffect(() => {
		createSubscription({ filters });
		return () => {
			removeSubscription();
		};
	}, [filters, createSubscription, removeSubscription]);
	return events?.[0];
};
