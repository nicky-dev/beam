"use client";
import * as React from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import {
	useLogin,
	useActiveUser,
	useNdk,
	useRealtimeProfile,
} from "nostr-hooks";
import {
	AppBar,
	Button,
	Container,
	LinearProgress,
	Paper,
	Toolbar,
} from "@mui/material";
import ProfileMenuButton from "@/component/ProfileMenuButton";
import StreamKeyBox from "@/component/StreamKeyBox";
import StreamUrlBox from "@/component/StreamUrlBox";
import PresetSettings from "@/component/PresetSettings";
import EditLiveInfo from "@/component/EditLiveInfo";
import NDKCacheAdapterDexie from "@nostr-dev-kit/ndk-cache-dexie";

const relays = [
	"wss://relay.damus.io",
	"wss://relay.nostr.band",
	"wss://nos.lol",
	"wss://nostr.land",
	"wss://purplerelay.com",
];

export default function Home() {
	const { ndk, initNdk } = useNdk();
	const { loginWithExtension, loginFromLocalStorage, loginData } = useLogin();
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

	if (status === "loading" || (status === "success" && !profile)) {
		return <LinearProgress />;
	}
	return (
		<Box
			sx={{
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
				minHeight: "100vh", // Full viewport height
				backgroundColor: "background.default",
				padding: { xs: 2, sm: 3 }, // Responsive padding
			}}
		>
			{status === "no-user" && !loginData.loginMethod ? (
				<Container maxWidth="sm">
					<Paper
						elevation={0} // Using custom shadow from theme
						sx={{
							padding: { xs: 4, md: 6 },
							textAlign: "center",
							width: "100%",
						}}
					>
						<Typography
							variant="h4"
							component="h1"
							gutterBottom
							sx={{ color: "text.primary", mb: 3 }}
						>
							Login
						</Typography>
						<Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
							Please connect your extension to continue.
						</Typography>

						{/* Login with Extension Button */}
						<Button
							fullWidth
							variant="outlined"
							color="primary"
							disabled={!window.nostr}
							onClick={() => loginWithExtension()}
							sx={{ mb: 3 }}
						>
							Login with Extension
						</Button>
					</Paper>
				</Container>
			) : null}
			{!!profile && (
				<>
					<AppBar>
						<Toolbar>
							<Typography>Live Studio</Typography>
							<Box flex={1} />
							<ProfileMenuButton profile={profile} />
						</Toolbar>
					</AppBar>
					<Box display="flex" flexDirection="column" minWidth="md">
						<StreamUrlBox />
						<StreamKeyBox />
						<Box display="flex">
							<PresetSettings />
							<Box mx={1} />
							<EditLiveInfo />
						</Box>
					</Box>
				</>
			)}
		</Box>
	);
}
