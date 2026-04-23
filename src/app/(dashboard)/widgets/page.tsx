"use client";
import * as React from "react";
import {
	Box,
	Typography,
	TextField,
	Button,
	Paper,
	Container,
} from "@mui/material";
import { useNdk, useActiveUser } from "nostr-hooks";
import { nip19, nip05 } from "nostr-tools";
import { useQuery } from "@tanstack/react-query";
import NDK, { NDKKind } from "@nostr-dev-kit/ndk";
import LiveChatWidget from "@/component/LiveChatWidget";
import TopZappersWidget from "@/component/TopZappersWidget";
import ViewersWidget from "@/component/ViewersWidget";

export default function WidgetsPage() {
	const { ndk } = useNdk();
	const { activeUser } = useActiveUser();

	// ใช้ useState เพื่อเก็บค่า npub ที่ผู้ใช้ป้อน
	const [inputNpub, setInputNpub] = React.useState<string>("");
	// ใช้ useState เพื่อเก็บค่า npub ที่จะส่งให้ Widget (เมื่อกดปุ่ม Apply)
	const [activeNpub, setActiveNpub] = React.useState<string>("");

	// Auto-fill with user's npub
	React.useEffect(() => {
		if (activeUser?.npub && !inputNpub) {
			setInputNpub(activeUser.npub);
		}
	}, [activeUser?.npub, inputNpub]);

	const handleApplyNpub = () => {
		setActiveNpub(inputNpub);
	};

	// Query เพื่อแปลง npub เป็น pubkey
	const pubkeyQuery = useQuery({
		queryKey: ["pubkey", activeNpub],
		enabled: !!activeNpub,
		queryFn: ({ queryKey }) => {
			const val = queryKey[1]?.toString() || "";
			if (nip05.isNip05(val)) {
				return nip05.queryProfile(val)?.then((d) => d?.pubkey);
			}
			try {
				return nip19.decode(val).data.toString();
			} catch {
				throw new Error(`Invalid npub or NIP-19 identifier: ${val}`);
			}
		},
	});

	// Query เพื่อดึงข้อมูล live event
	const liveInfo = useQuery({
		queryKey: ["live-info", { ndk, pubkey: pubkeyQuery.data }],
		enabled: pubkeyQuery.isFetched && !!pubkeyQuery.data && !!ndk,
		queryFn: async ({ queryKey }) => {
			const { ndk, pubkey } = queryKey[1] as {
				ndk: NDK;
				pubkey: string;
			};
			return ndk.fetchEvent([
				{
					limit: 1,
					kinds: [30311 as NDKKind],
					"#p": [pubkey],
				},
				{
					limit: 1,
					kinds: [30311 as NDKKind],
					authors: [pubkey],
				},
			]);
		},
	});

	const liveId = React.useMemo(
		() => liveInfo.data?.deduplicationKey(),
		[liveInfo.data],
	);

	return (
		<Container maxWidth="lg" disableGutters>
			<Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4 }}>
				Stream Widgets
			</Typography>

			{/* Input Section */}
			<Paper elevation={0} sx={{ p: 3, mb: 4 }}>
				<Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
					Widget Configuration
				</Typography>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
					Enter your npub or NIP-05 to generate widget URLs for OBS
				</Typography>
				<Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
					<TextField
						label="Streamer npub or NIP-05"
						variant="outlined"
						fullWidth
						value={inputNpub}
						onChange={(e) => setInputNpub(e.target.value)}
						placeholder="npub1... or name@domain.com"
						size="small"
					/>
					<Button
						variant="contained"
						color="primary"
						onClick={handleApplyNpub}
						disabled={!inputNpub}
						sx={{ minWidth: "120px" }}
					>
						Load Widgets
					</Button>
				</Box>
			</Paper>

			{/* Widget: Live Chat */}
			<Paper elevation={0} sx={{ p: 3, mb: 3 }}>
				<Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
					Live Chat Widget
				</Typography>

				{activeNpub && liveId ? (
					<>
						<WidgetUrlBox
							label="OBS Browser Source URL"
							url={`${typeof window !== "undefined" ? window.location.origin : ""}/embed/live/${activeNpub}/live-chat?now=0`}
						/>
						<Box
							sx={{
								border: "1px solid",
								borderColor: "divider",
								borderRadius: 1,
								overflow: "hidden",
								height: 500,
								maxWidth: 400,
								mx: "auto",
								backgroundColor: "rgba(0, 0, 0, 0.3)",
							}}
						>
							<LiveChatWidget liveId={liveId} now={true} />
						</Box>
					</>
				) : (
					<Typography variant="body2" color="text.secondary" textAlign="center">
						Enter npub above to preview Live Chat widget
					</Typography>
				)}
			</Paper>

			{/* Widget: Top Zappers */}
			<Paper elevation={0} sx={{ p: 3, mb: 3 }}>
				<Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
					Top Zappers Widget
				</Typography>

				{activeNpub && liveId ? (
					<>
						<WidgetUrlBox
							label="OBS Browser Source URL"
							url={`${typeof window !== "undefined" ? window.location.origin : ""}/embed/live/${activeNpub}/top-zappers`}
						/>
						<Box
							sx={{
								border: "1px solid",
								borderColor: "divider",
								borderRadius: 1,
								overflow: "hidden",
								height: 350,
								maxWidth: 350,
								mx: "auto",
								backgroundColor: "rgba(0, 0, 0, 0.3)",
							}}
						>
							<TopZappersWidget liveId={liveId} />
						</Box>
					</>
				) : (
					<Typography variant="body2" color="text.secondary" textAlign="center">
						Enter npub above to preview Top Zappers widget
					</Typography>
				)}
			</Paper>

			{/* Widget: Viewers */}
			<Paper elevation={0} sx={{ p: 3, mb: 3 }}>
				<Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
					Viewers Widget
				</Typography>

				{activeNpub && liveId && liveInfo.data ? (
					<>
						<WidgetUrlBox
							label="OBS Browser Source URL"
							url={`${typeof window !== "undefined" ? window.location.origin : ""}/embed/live/${activeNpub}/viewers`}
						/>
						<Box
							sx={{
								border: "1px solid",
								borderColor: "divider",
								borderRadius: 1,
								overflow: "hidden",
								height: 150,
								maxWidth: 300,
								mx: "auto",
								backgroundColor: "rgba(0, 0, 0, 0.3)",
							}}
						>
							<ViewersWidget liveInfo={liveInfo.data} />
						</Box>
					</>
				) : (
					<Typography variant="body2" color="text.secondary" textAlign="center">
						Enter npub above to preview Viewers widget
					</Typography>
				)}
			</Paper>
		</Container>
	);
}

// Component for displaying widget URL with copy button
function WidgetUrlBox({ label, url }: { label: string; url: string }) {
	const [copied, setCopied] = React.useState(false);

	const handleCopy = () => {
		navigator.clipboard.writeText(url);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<Box sx={{ mb: 3 }}>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
				{label}
			</Typography>
			<Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
				<TextField
					fullWidth
					value={url}
					InputProps={{ readOnly: true }}
					size="small"
				/>
				<Button
					variant="outlined"
					size="small"
					onClick={handleCopy}
					sx={{ minWidth: 80 }}
				>
					{copied ? "Copied!" : "Copy"}
				</Button>
			</Box>
		</Box>
	);
}
