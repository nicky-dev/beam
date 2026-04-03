"use client";
import { useRef, useCallback, useState, useEffect, useMemo } from "react";
import {
	Box,
	Paper,
	Typography,
	TextField,
	Button,
	Switch,
	FormControlLabel,
	Chip,
	Stack,
	Accordion,
	AccordionSummary,
	AccordionDetails,
	Alert,
	CircularProgress,
	Tooltip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import YouTubeIcon from "@mui/icons-material/YouTube";
import FacebookIcon from "@mui/icons-material/Facebook";
import VideogameAssetIcon from "@mui/icons-material/VideogameAsset"; // For Twitch
import MusicNoteIcon from "@mui/icons-material/MusicNote"; // For TikTok
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import SettingsIcon from "@mui/icons-material/Settings";
import LinkIcon from "@mui/icons-material/Link";
import { useActiveUser, useNdk } from "nostr-hooks";
import { useQuery } from "@tanstack/react-query";
import { default as NDK, NDKEvent, NDKKind, NDKUser } from "@nostr-dev-kit/ndk";

// Backend API URL - can be configured via environment variable
const PUSH_API_URL = process.env.NEXT_PUBLIC_PUSH_API_URL || "http://localhost:8080";

interface PlatformConfig {
	enabled: boolean;
	streamKey: string;
	serverUrl: string;
	isLive: boolean;
	pushId?: string; // Store pushId from API for stopping
}

interface ForwardStreamConfig {
	youtube: PlatformConfig;
	facebook: PlatformConfig;
	twitch: PlatformConfig;
	tiktok: PlatformConfig;
}

interface PushInfo {
	pushId: string;
	platform: string;
	rtmpUrl: string;
	status: string;
}

const defaultConfig: ForwardStreamConfig = {
	youtube: {
		enabled: false,
		streamKey: "",
		serverUrl: "rtmp://a.rtmp.youtube.com/live2/",
		isLive: false,
	},
	facebook: {
		enabled: false,
		streamKey: "",
		serverUrl: "rtmps://live-api-s.facebook.com:443/rtmp/",
		isLive: false,
	},
	twitch: {
		enabled: false,
		streamKey: "",
		serverUrl: "rtmp://live.twitch.tv/app/",
		isLive: false,
	},
	tiktok: {
		enabled: false,
		streamKey: "",
		serverUrl: "rtmp://push.tiktok.com/live/",
		isLive: false,
	},
};

function getPlatformIcon(platform: keyof ForwardStreamConfig) {
	switch (platform) {
		case "youtube":
			return <YouTubeIcon sx={{ color: "#FF0000" }} />;
		case "facebook":
			return <FacebookIcon sx={{ color: "#1877F2" }} />;
		case "twitch":
			return <VideogameAssetIcon sx={{ color: "#9146FF" }} />;
		case "tiktok":
			return <MusicNoteIcon sx={{ color: "#EE1D52" }} />;
	}
}

function getPlatformName(platform: keyof ForwardStreamConfig) {
	return platform.charAt(0).toUpperCase() + platform.slice(1);
}

type QueryKey = [string, { ndk?: NDK; activeUser?: NDKUser | null }];
type QueryResult = NDKEvent | null;

export default function ForwardStreamSettings() {
	const { ndk } = useNdk();
	const { activeUser } = useActiveUser();

	const configQuery = useQuery<unknown, unknown, QueryResult, QueryKey>({
		queryKey: ["push-streams-config", { ndk, activeUser }],
		enabled: !!ndk && !!activeUser,
		queryFn: async ({ queryKey }) => {
			const { ndk, activeUser } = queryKey[1];
			if (!ndk || !activeUser) return null;
			return await ndk.fetchEvent({
				limit: 1,
				kinds: [30078],
				"#d": ["beamlivestudio-push-streams"],
				authors: [activeUser.pubkey],
			});
		},
	});

	// Live streaming status via WebSocket subscription (kind 30311)
	const [liveEvent, setLiveEvent] = useState<NDKEvent | null>(null);
	const [isLiveStatusLoading, setIsLiveStatusLoading] = useState(true);

	useEffect(() => {
		if (!ndk || !activeUser) return;

		setIsLiveStatusLoading(true);

		const subscription = ndk.subscribe(
			[
				{
					kinds: [30311 as NDKKind],
					"#p": [activeUser.pubkey],
				},
				{
					kinds: [30311 as NDKKind],
					authors: [activeUser.pubkey],
				},
			],
			{ closeOnEose: false }
		);

		subscription.on("event", (event: NDKEvent) => {
			setLiveEvent((prev) => {
				// Keep the most recent event
				if (!prev || (event.created_at ?? 0) > (prev.created_at ?? 0)) {
					return event;
				}
				return prev;
			});
			setIsLiveStatusLoading(false);
		});

		subscription.on("eose", () => {
			setIsLiveStatusLoading(false);
		});

		return () => {
			subscription.stop();
		};
	}, [ndk, activeUser]);

	// Check if user is currently streaming based on live event status
	const isStreaming = useMemo(() => {
		if (!liveEvent) return false;
		const status = liveEvent.tags.find(tag => tag[0] === "status")?.[1];
		return status === "live";
	}, [liveEvent]);

	// Get streamId from live event
	const streamId = useMemo(() => {
		if (!liveEvent) return null;
		// Use the event's deduplication key or d-tag as streamId
		const dTag = liveEvent.tags.find(tag => tag[0] === "d")?.[1];
		return dTag || liveEvent.id;
	}, [liveEvent]);

	// Query active push list
	const pushListQuery = useQuery({
		queryKey: ["push-list", streamId],
		enabled: !!streamId && isStreaming,
		refetchInterval: 5000,
		queryFn: async () => {
			const response = await fetch(`${PUSH_API_URL}/v1/push/list/${streamId}`);
			if (!response.ok) return [];
			const data = await response.json();
			return data as PushInfo[];
		},
	});

	const [config, setConfig] = useState<ForwardStreamConfig>(defaultConfig);
	const [isSaving, setIsSaving] = useState(false);
	const [forwardError, setForwardError] = useState<string | null>(null);
	const [loadedEventId, setLoadedEventId] = useState<string | null>(null);
	const [connectingPlatforms, setConnectingPlatforms] = useState<
		Set<keyof ForwardStreamConfig>
	>(new Set());
	const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

	// Update isLive status based on push list
	useEffect(() => {
		if (!pushListQuery.data) return;

		const activePushes = pushListQuery.data;
		setConfig((prev) => {
			const updated = { ...prev };

			// Check each platform
			for (const platform of ["youtube", "facebook", "twitch", "tiktok"] as const) {
				const push = activePushes.find((p) =>
					p.rtmpUrl.includes(prev[platform].serverUrl) ||
					p.platform === platform
				);
				if (push) {
					updated[platform] = {
						...updated[platform],
						isLive: true,
						pushId: push.pushId,
					};
				} else {
					updated[platform] = {
						...updated[platform],
						isLive: false,
						pushId: undefined,
					};
				}
			}

			return updated;
		});
	}, [pushListQuery.data]);

	// Load and decrypt config from Nostr event
	useEffect(() => {
		const event = configQuery.data;
		if (!event || !activeUser) return;

		// Skip if we already loaded this event
		if (loadedEventId === event.id) return;

		const loadConfig = async () => {
			const content = event.content;

			// First, try to parse as plain JSON
			try {
				const loadedConfig = JSON.parse(content);
				setConfig({ ...defaultConfig, ...loadedConfig });
				setLoadedEventId(event.id);
				return;
			} catch {
				// Not valid JSON, likely encrypted
			}

			// Try to decrypt
			try {
				await event.decrypt(activeUser);
				const loadedConfig = JSON.parse(event.content);
				setConfig({ ...defaultConfig, ...loadedConfig });
				setLoadedEventId(event.id);
			} catch (e) {
				console.error("Failed to decrypt/parse config:", e);
				// Use default config if we can't load
				setLoadedEventId(event.id);
			}
		};
		loadConfig();
	}, [configQuery.data, activeUser, loadedEventId]);

	// Save config to Nostr with encryption (debounced)
	const doSaveConfig = useCallback(
		async (newConfig: ForwardStreamConfig) => {
			if (!ndk || !activeUser) return;

			try {
				setIsSaving(true);
				const event = new NDKEvent(ndk, {
					kind: 30078,
					content: JSON.stringify(newConfig),
					pubkey: activeUser.pubkey,
					tags: [["d", "beamlivestudio-push-streams"]],
				});

				// Encrypt the content using NIP-04
				await event.encrypt(activeUser);
				await event.publish();
			} catch (e) {
				console.error("Failed to save config:", e);
			} finally {
				setIsSaving(false);
			}
		},
		[ndk, activeUser],
	);

	// Debounced save - waits 1 second after last change before saving
	const saveConfig = useCallback(
		(newConfig: ForwardStreamConfig) => {
			if (saveTimerRef.current) {
				clearTimeout(saveTimerRef.current);
			}
			setIsSaving(true);
			saveTimerRef.current = setTimeout(() => {
				doSaveConfig(newConfig);
			}, 1000);
		},
		[doSaveConfig],
	);

	// Save config to localStorage whenever it changes
	useEffect(() => {
		if (typeof window !== "undefined") {
			localStorage.setItem("forwardStreamConfig", JSON.stringify(config));
		}
	}, [config]);

	const handleTogglePlatform = (
		platform: keyof ForwardStreamConfig,
		enabled: boolean,
	) => {
		const newConfig = {
			...config,
			[platform]: {
				...config[platform],
				enabled,
			},
		};
		setConfig(newConfig);
		saveConfig(newConfig);
	};

	const handleStreamKeyChange = (
		platform: keyof ForwardStreamConfig,
		streamKey: string,
	) => {
		const newConfig = {
			...config,
			[platform]: {
				...config[platform],
				streamKey,
			},
		};
		setConfig(newConfig);
		saveConfig(newConfig);
	};

	const handleServerUrlChange = (
		platform: keyof ForwardStreamConfig,
		serverUrl: string,
	) => {
		const newConfig = {
			...config,
			[platform]: {
				...config[platform],
				serverUrl,
			},
		};
		setConfig(newConfig);
		saveConfig(newConfig);
	};

	// Open OAuth popup to connect a platform and auto-retrieve its stream key
	const handleOAuthConnect = useCallback(
		(platform: keyof ForwardStreamConfig) => {
			const popup = window.open(
				`/api/auth/${platform}`,
				`${platform}-oauth`,
				"width=600,height=700,scrollbars=yes,resizable=yes",
			);

			if (!popup) {
				setForwardError(
					"Popup was blocked. Please allow popups for this site and try again.",
				);
				return;
			}

			// Some browsers return a non-null window that is immediately closed
			setTimeout(() => {
				if (popup.closed) {
					setForwardError(
						"Popup was blocked. Please allow popups for this site and try again.",
					);
					return;
				}
			}, 100);

			setConnectingPlatforms((prev) => new Set([...prev, platform]));

			const handleMessage = (event: MessageEvent) => {
				if (event.origin !== window.location.origin) return;

				const data = event.data;
				if (
					!data ||
					typeof data !== "object" ||
					typeof data.type !== "string" ||
					typeof data.platform !== "string" ||
					data.platform !== platform
				)
					return;

				if (data.type === "oauth-success") {
					const streamKey =
						typeof data.streamKey === "string" ? data.streamKey : "";
					const serverUrl =
						typeof data.serverUrl === "string" ? data.serverUrl : "";
					setConfig((prev) => {
						const newConfig = {
							...prev,
							[platform]: {
								...prev[platform],
								streamKey: streamKey || prev[platform].streamKey,
								serverUrl: serverUrl || prev[platform].serverUrl,
								enabled: true,
							},
						};
						saveConfig(newConfig);
						return newConfig;
					});
				} else if (data.type === "oauth-error") {
					const errorMsg =
						typeof data.error === "string" ? data.error : "Unknown error";
					setForwardError(
						`Failed to connect ${getPlatformName(platform)}: ${errorMsg}`,
					);
				}

				setConnectingPlatforms((prev) => {
					const next = new Set(prev);
					next.delete(platform);
					return next;
				});
				window.removeEventListener("message", handleMessage);
			};

			window.addEventListener("message", handleMessage);

			// Detect popup closed without completing OAuth
			const pollTimer = setInterval(() => {
				if (popup.closed) {
					clearInterval(pollTimer);
					window.removeEventListener("message", handleMessage);
					setConnectingPlatforms((prev) => {
						const next = new Set(prev);
						next.delete(platform);
						return next;
					});
				}
			}, 500);
		},
		[saveConfig],
	);

	const handleStartForward = useCallback(
		async (platform: keyof ForwardStreamConfig) => {
			if (!isStreaming || !streamId) {
				setForwardError("Please start your main stream first before forwarding.");
				return;
			}

			const platformConfig = config[platform];
			if (!platformConfig.streamKey || !platformConfig.serverUrl) {
				setForwardError("Please configure server URL and stream key first.");
				return;
			}

			setForwardError(null);

			try {
				const response = await fetch(`${PUSH_API_URL}/v1/push/start`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						streamId,
						streamKey: platformConfig.streamKey,
						rtmpUrl: platformConfig.serverUrl,
					}),
				});

				if (!response.ok) {
					const error = await response.json().catch(() => ({ message: "Failed to start forward" }));
					throw new Error(error.message || "Failed to start forward");
				}

				const data = await response.json();
				const pushId = data.pushId;

				setConfig((prev) => ({
					...prev,
					[platform]: {
						...prev[platform],
						isLive: true,
						pushId,
					},
				}));

				// Refetch push list
				pushListQuery.refetch();
			} catch (error) {
				console.error(`Failed to start forward to ${platform}:`, error);
				setForwardError(error instanceof Error ? error.message : "Failed to start forward");
			}
		},
		[isStreaming, streamId, config, pushListQuery],
	);

	// Start forwarding to all enabled platforms at once
	const handleStartAllForward = useCallback(async () => {
		if (!isStreaming || !streamId) {
			setForwardError(
				"Please start your main stream first before forwarding.",
			);
			return;
		}

		const enabledPlatforms = (
			["youtube", "facebook", "twitch", "tiktok"] as const
		).filter(
			(p) =>
				config[p].enabled && !config[p].isLive && config[p].streamKey,
		);

		if (enabledPlatforms.length === 0) {
			setForwardError(
				"No platforms are enabled and ready. Enable at least one platform with a stream key.",
			);
			return;
		}

		setForwardError(null);
		await Promise.allSettled(
			enabledPlatforms.map((p) => handleStartForward(p)),
		);
	}, [isStreaming, streamId, config, handleStartForward]);

	const handleStopForward = async (platform: keyof ForwardStreamConfig) => {
		const platformConfig = config[platform];
		if (!platformConfig.pushId) {
			setForwardError("No active push found for this platform");
			return;
		}

		setForwardError(null);

		try {
			const response = await fetch(`${PUSH_API_URL}/v1/push/stop`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					pushId: platformConfig.pushId,
				}),
			});

			if (!response.ok) {
				const error = await response.json().catch(() => ({ message: "Failed to stop forward" }));
				throw new Error(error.message || "Failed to stop forward");
			}

			setConfig((prev) => ({
				...prev,
				[platform]: {
					...prev[platform],
					isLive: false,
					pushId: undefined,
				},
			}));

			// Refetch push list
			pushListQuery.refetch();
		} catch (error) {
			console.error(`Failed to stop forward to ${platform}:`, error);
			setForwardError(error instanceof Error ? error.message : "Failed to stop forward");
		}
	};

	const renderPlatformSettings = (platform: keyof ForwardStreamConfig) => {
		const platformConfig = config[platform];
		const isConnecting = connectingPlatforms.has(platform);

		return (
			<Accordion key={platform}>
				<AccordionSummary expandIcon={<ExpandMoreIcon />}>
					<Box
						display="flex"
						alignItems="center"
						justifyContent="space-between"
						width="100%"
						mr={2}
					>
						<Box display="flex" alignItems="center" gap={1}>
							{getPlatformIcon(platform)}
							<Typography>{getPlatformName(platform)}</Typography>
						</Box>
						<Box display="flex" alignItems="center" gap={1}>
							{platformConfig.isLive && (
								<Chip
									label="LIVE"
									color="error"
									size="small"
									sx={{ animation: "pulse 2s infinite" }}
								/>
							)}
							<FormControlLabel
								control={
									<Switch
										checked={platformConfig.enabled}
										onChange={(e) =>
											handleTogglePlatform(platform, e.target.checked)
										}
										onClick={(e) => e.stopPropagation()}
									/>
								}
								label="Enable"
								onClick={(e) => e.stopPropagation()}
							/>
						</Box>
					</Box>
				</AccordionSummary>
				<AccordionDetails>
					<Stack spacing={2}>
						<TextField
							fullWidth
							label="Server URL"
							value={platformConfig.serverUrl}
							onChange={(e) => handleServerUrlChange(platform, e.target.value)}
							disabled={!platformConfig.enabled}
							size="small"
						/>
						<Box display="flex" gap={1} alignItems="flex-start">
							<TextField
								fullWidth
								label="Stream Key"
								type="password"
								value={platformConfig.streamKey}
								onChange={(e) => handleStreamKeyChange(platform, e.target.value)}
								disabled={!platformConfig.enabled}
								size="small"
								helperText="Keep your stream key secure"
							/>
							<Tooltip title={`Connect ${getPlatformName(platform)} via OAuth to auto-fill stream key`}>
								<span>
									<Button
										variant="outlined"
										size="small"
										startIcon={
											isConnecting ? (
												<CircularProgress size={16} />
											) : (
												<LinkIcon />
											)
										}
										onClick={() => handleOAuthConnect(platform)}
										disabled={!platformConfig.enabled || isConnecting}
										sx={{ mt: 0.25, whiteSpace: "nowrap" }}
									>
										{isConnecting ? "Connecting..." : "Connect"}
									</Button>
								</span>
							</Tooltip>
						</Box>
						<Box display="flex" gap={1}>
							{!platformConfig.isLive ? (
								<Button
									variant="contained"
									color="success"
									startIcon={<PlayArrowIcon />}
									onClick={() => handleStartForward(platform)}
									disabled={
										!platformConfig.enabled || !platformConfig.streamKey
									}
									fullWidth
								>
									Start Forward
								</Button>
							) : (
								<Button
									variant="contained"
									color="error"
									startIcon={<StopIcon />}
									onClick={() => handleStopForward(platform)}
									fullWidth
								>
									Stop Forward
								</Button>
							)}
						</Box>
					</Stack>
				</AccordionDetails>
			</Accordion>
		);
	};

	return (
		<Paper
			elevation={0}
			sx={{
				padding: 3,
				width: "100%",
			}}
		>
			<Box display="flex" alignItems="center" gap={1} mb={2}>
				<SettingsIcon />
				<Typography variant="h6">Forward Stream Settings</Typography>
				{isSaving && (
					<CircularProgress size={20} sx={{ ml: 1 }} />
				)}
			</Box>

			{configQuery.isLoading ? (
				<Box display="flex" justifyContent="center" p={4}>
					<CircularProgress />
				</Box>
			) : (
				<>
					{!isStreaming && (
						<Alert severity="info" sx={{ mb: 2 }}>
							Start your main stream first to enable forwarding to other platforms.
						</Alert>
					)}

					{forwardError && (
						<Alert severity="error" sx={{ mb: 2 }} onClose={() => setForwardError(null)}>
							{forwardError}
						</Alert>
					)}

					<Box display="flex" alignItems="center" gap={1} mb={2}>
						<Typography variant="body2" color="text.secondary">
							Main Stream Status:
						</Typography>
						{isStreaming ? (
							<Chip
								label="LIVE"
								color="error"
								size="small"
								sx={{ animation: "pulse 2s infinite" }}
							/>
						) : (
							<Chip label="OFFLINE" size="small" />
						)}
						{isLiveStatusLoading && (
							<CircularProgress size={16} />
						)}
					</Box>

					{isStreaming && (
						<Button
							variant="contained"
							color="success"
							startIcon={<PlayArrowIcon />}
							onClick={handleStartAllForward}
							sx={{ mb: 2 }}
							fullWidth
						>
							Start All Forward
						</Button>
					)}

					<Stack spacing={1}>
						{renderPlatformSettings("youtube")}
						{renderPlatformSettings("facebook")}
						{renderPlatformSettings("twitch")}
						{renderPlatformSettings("tiktok")}
					</Stack>
				</>
			)}

			<style jsx global>{`
				@keyframes pulse {
					0%,
					100% {
						opacity: 1;
					}
					50% {
						opacity: 0.5;
					}
				}
			`}</style>
		</Paper>
	);
}
