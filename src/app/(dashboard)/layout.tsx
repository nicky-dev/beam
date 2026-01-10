"use client";
import * as React from "react";
import Box from "@mui/material/Box";
import { LinearProgress } from "@mui/material";
import {
	useLogin,
	useActiveUser,
	useNdk,
	useRealtimeProfile,
} from "nostr-hooks";
import NDKCacheAdapterDexie from "@nostr-dev-kit/ndk-cache-dexie";
import AppNavigation from "@/component/AppNavigation";
import LoginScreen from "@/component/LoginScreen";

const relays = [
	"wss://relay.damus.io",
	"wss://relay.nostr.band",
	"wss://nos.lol",
	"wss://nostr.land",
	"wss://purplerelay.com",
];

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { ndk, initNdk } = useNdk();
	const { loginWithExtension, loginWithPrivateKey, loginFromLocalStorage, loginData } = useLogin();
	const { activeUser, status } = useActiveUser();
	const { profile } = useRealtimeProfile(activeUser?.pubkey);

	React.useEffect(() => {
		initNdk({
			cacheAdapter: new NDKCacheAdapterDexie(),
			autoConnectUserRelays: true,
			explicitRelayUrls: relays,
		});
	}, [initNdk]);

	React.useEffect(() => {
		if (status === "no-user") return;
		ndk?.connect();
	}, [status, ndk]);

	React.useEffect(() => {
		if (status !== "no-user") return;
		loginFromLocalStorage();
	}, [status, loginFromLocalStorage]);

	// Loading state
	if (status === "loading" || (status === "success" && !profile)) {
		return <LinearProgress />;
	}

	// Login screen
	if (status === "no-user" && !loginData.loginMethod) {
		return (
			<LoginScreen
				onLoginWithExtension={() => loginWithExtension()}
				onLoginWithPrivateKey={(privateKey) => loginWithPrivateKey({ privateKey })}
				extensionDisabled={typeof window !== "undefined" && !window.nostr}
			/>
		);
	}

	// Main app layout
	return (
		<Box
			sx={{
				height: "100vh",
				display: "flex",
				flexDirection: "column",
				backgroundColor: "background.default",
				overflow: "hidden",
			}}
		>
			{!!profile && (
				<>
					<AppNavigation />
					<Box
						sx={{
							flex: 1,
							overflow: "auto",
							p: { xs: 2, sm: 3 },
						}}
					>
						{children}
					</Box>
				</>
			)}
		</Box>
	);
}
