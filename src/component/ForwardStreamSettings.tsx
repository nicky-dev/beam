"use client";
import { useRef, useCallback, useState, useEffect, useMemo } from "react";
import {
	Box,
	Paper,
	Typography,
	TextField,
	Button,
	Chip,
	Stack,
	Accordion,
	AccordionSummary,
	AccordionDetails,
	Alert,
	CircularProgress,
	Tooltip,
	IconButton,
	InputAdornment,
	Snackbar,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import YouTubeIcon from "@mui/icons-material/YouTube";
import FacebookIcon from "@mui/icons-material/Facebook";
import VideogameAssetIcon from "@mui/icons-material/VideogameAsset"; // For Twitch
import MusicNoteIcon from "@mui/icons-material/MusicNote"; // For TikTok
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import StopCircleIcon from "@mui/icons-material/StopCircle";
import SettingsIcon from "@mui/icons-material/Settings";
import LinkIcon from "@mui/icons-material/Link";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useActiveUser, useNdk } from "nostr-hooks";
import { useQuery } from "@tanstack/react-query";
import { default as NDK, NDKEvent, NDKKind, NDKUser } from "@nostr-dev-kit/ndk";
import { keyframes } from "@emotion/react";
import { PLATFORM_RTMP_URLS } from "@/lib/streaming/constants";

// Backend API URL - can be configured via environment variable
const PUSH_API_URL =
	process.env.NEXT_PUBLIC_PUSH_API_URL || "http://localhost:8080";

interface PlatformConfig {
	streamKey: string;
	serverUrl: string;
	accessToken: string;
	refreshToken?: string;
	tokenExpiresAt?: number;
	broadcastId?: string;
	isLive: boolean;
	pushId?: string;
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
		streamKey: "",
		serverUrl: PLATFORM_RTMP_URLS.youtube,
		accessToken: "",
		isLive: false,
	},
	facebook: {
		streamKey: "",
		serverUrl: PLATFORM_RTMP_URLS.facebook,
		accessToken: "",
		isLive: false,
	},
	twitch: {
		streamKey: "",
		serverUrl: PLATFORM_RTMP_URLS.twitch,
		accessToken: "",
		isLive: false,
	},
	tiktok: {
		streamKey: "",
		serverUrl: PLATFORM_RTMP_URLS.tiktok,
		accessToken: "",
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

const pulse = keyframes`
	0%, 100% { opacity: 1; }
	50% { opacity: 0.5; }
`;

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
			{ closeOnEose: false },
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
		const status = liveEvent.tags.find((tag) => tag[0] === "status")?.[1];
		return status === "live";
	}, [liveEvent]);

	// Get streamId from live event
	const streamId = useMemo(() => {
		if (!liveEvent) return null;
		// Use the event's deduplication key or d-tag as streamId
		const dTag = liveEvent.tags.find((tag) => tag[0] === "d")?.[1];
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

	// Query preset config for broadcast title/description
	const presetQuery = useQuery<unknown, unknown, QueryResult, QueryKey>({
		queryKey: ["preset-config", { ndk, activeUser }],
		enabled: !!ndk && !!activeUser,
		queryFn: async ({ queryKey }) => {
			const { ndk, activeUser } = queryKey[1];
			if (!ndk || !activeUser) return null;
			return await ndk.fetchEvent({
				limit: 1,
				kinds: [30078],
				"#d": ["beamlivestudio-config"],
				authors: [activeUser.pubkey],
			});
		},
	});

	const presetData = useMemo(() => {
		try {
			return JSON.parse(presetQuery.data?.content || "{}") as { title?: string; summary?: string; image?: string };
		} catch {
			return {} as { title?: string; summary?: string; image?: string };
		}
	}, [presetQuery.data?.content]);

	const [config, setConfig] = useState<ForwardStreamConfig>(defaultConfig);
	const [isSaving, setIsSaving] = useState(false);
	const [forwardError, setForwardError] = useState<string | null>(null);
	const [loadedEventId, setLoadedEventId] = useState<string | null>(null);
	const [connectingPlatforms, setConnectingPlatforms] = useState<
		Set<keyof ForwardStreamConfig>
	>(new Set());
	const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

	// Snackbar feedback states
	const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
		open: false,
		message: "",
		severity: "success",
	});
	const [decryptError, setDecryptError] = useState(false);

	// Platforms currently creating a broadcast
	const [broadcastCreating, setBroadcastCreating] = useState<Set<keyof ForwardStreamConfig>>(new Set());

	// Update isLive status based on push list
	useEffect(() => {
		if (!pushListQuery.data) return;

		const activePushes = pushListQuery.data;
		setConfig((prev) => {
			const updated = { ...prev };

			// Check each platform
			for (const platform of [
				"youtube",
				"facebook",
				"twitch",
				"tiktok",
			] as const) {
				const push = activePushes.find(
					(p) =>
						p.rtmpUrl.includes(prev[platform].serverUrl) ||
						p.platform === platform,
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
				setDecryptError(true);
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
				setSnackbar({ open: true, message: "Settings saved", severity: "success" });
			} catch (e) {
				console.error("Failed to save config:", e);
				setSnackbar({
					open: true,
					message: e instanceof Error ? `Save failed: ${e.message}` : "Failed to save settings",
					severity: "error",
				});
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

	const handleDisconnect = (platform: keyof ForwardStreamConfig) => {
		const newConfig = {
			...config,
			[platform]: {
				...config[platform],
				streamKey: "",
				serverUrl: defaultConfig[platform].serverUrl,
				accessToken: "",
				refreshToken: undefined,
				tokenExpiresAt: undefined,
				broadcastId: undefined,
			},
		};
		setConfig(newConfig);
		saveConfig(newConfig);
	};

	const handleCopyToClipboard = async (text: string) => {
		try {
			await navigator.clipboard.writeText(text);
			setSnackbar({ open: true, message: "Copied!", severity: "success" });
		} catch {
			setSnackbar({ open: true, message: "Failed to copy", severity: "error" });
		}
	};

	const isValidOAuthMessage = useCallback(
		(data: unknown, platform: keyof ForwardStreamConfig): boolean => {
			return (
				!!data &&
				typeof data === "object" &&
				typeof (data as Record<string, unknown>).type === "string" &&
				typeof (data as Record<string, unknown>).platform === "string" &&
				(data as Record<string, unknown>).platform === platform
			);
		},
		[],
	);

	const handleOAuthSuccess = useCallback(
		(data: Record<string, unknown>, platform: keyof ForwardStreamConfig) => {
			const streamKey =
				typeof data.streamKey === "string" ? data.streamKey : "";
			const serverUrl =
				typeof data.serverUrl === "string" ? data.serverUrl : "";
			const accessToken =
				typeof data.accessToken === "string" ? data.accessToken : "";
			const refreshToken =
				typeof data.refreshToken === "string" ? data.refreshToken : undefined;
			setConfig((prev) => {
				const newConfig = {
					...prev,
					[platform]: {
						...prev[platform],
						streamKey: streamKey || prev[platform].streamKey,
						serverUrl: serverUrl || prev[platform].serverUrl,
						accessToken,
						refreshToken,
					},
				};
				saveConfig(newConfig);
				return newConfig;
			});
		},
		[saveConfig],
	);

	const handleOAuthError = useCallback(
		(data: Record<string, unknown>, platform: keyof ForwardStreamConfig) => {
			const errorMsg =
				typeof data.error === "string" ? data.error : "Unknown error";
			setForwardError(
				`Failed to connect ${getPlatformName(platform)}: ${errorMsg}`,
			);
		},
		[],
	);

	const handleOAuthMessage = useCallback(
		(
			event: MessageEvent,
			platform: keyof ForwardStreamConfig,
			handleMessage: (e: MessageEvent) => void,
		) => {
			if (event.origin !== window.location.origin) return;

			const data = event.data as Record<string, unknown>;
			if (!isValidOAuthMessage(data, platform)) return;

			if (data.type === "oauth-success") {
				handleOAuthSuccess(data, platform);
			} else if (data.type === "oauth-error") {
				handleOAuthError(data, platform);
			}

			setConnectingPlatforms((prev) => {
				const next = new Set(prev);
				next.delete(platform);
				return next;
			});
			window.removeEventListener("message", handleMessage);
		},
		[isValidOAuthMessage, handleOAuthSuccess, handleOAuthError],
	);

	// Setup message listener for OAuth callback
	const setupOAuthMessageListener = useCallback(
		(platform: keyof ForwardStreamConfig, popup: Window) => {
			const handleMessage = (event: MessageEvent) => {
				handleOAuthMessage(event, platform, handleMessage);
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
		[handleOAuthMessage],
	);

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
			setupOAuthMessageListener(platform, popup);
		},
		[setupOAuthMessageListener],
	);


	const handleStartForward = useCallback(
		async (platform: keyof ForwardStreamConfig) => {
			if (!isStreaming || !streamId) {
				setForwardError(
					"Please start your main stream first before forwarding.",
				);
				return;
			}

			const platformConfig = config[platform];
			if (!platformConfig.accessToken) {
				setForwardError(`Please connect your ${getPlatformName(platform)} account first.`);
				return;
			}

			setForwardError(null);

			try {
				// Step 1: Create broadcast via API
				setBroadcastCreating((prev) => new Set([...prev, platform]));

				const broadcastResponse = await fetch(`/api/stream/${platform}/broadcast`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						accessToken: platformConfig.accessToken,
						title: presetData.title || "Live Stream",
						description: presetData.summary || "",
						image: presetData.image,
					}),
				});

				if (!broadcastResponse.ok) {
					const err = await broadcastResponse.json().catch(() => ({ message: "Failed to create broadcast" }));
					throw new Error(err.message || "Failed to create broadcast");
				}

				const broadcastData = (await broadcastResponse.json()) as {
					broadcastId: string;
					streamKey?: string;
					serverUrl?: string;
				};

				// Step 2: Update config with broadcast response (FB/TikTok may return new credentials)
				const updatedPlatformConfig = {
					...platformConfig,
					broadcastId: broadcastData.broadcastId,
					streamKey: broadcastData.streamKey || platformConfig.streamKey,
					serverUrl: broadcastData.serverUrl || platformConfig.serverUrl,
				};

				setConfig((prev) => ({
					...prev,
					[platform]: updatedPlatformConfig,
				}));

				// Step 3: Call push API with (potentially updated) credentials
				const pushResponse = await fetch(`${PUSH_API_URL}/v1/push/start`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						streamId,
						streamKey: updatedPlatformConfig.streamKey,
						rtmpUrl: updatedPlatformConfig.serverUrl,
					}),
				});

				if (!pushResponse.ok) {
					const error = await pushResponse.json().catch(() => ({ message: "Failed to start forward" }));
					throw new Error(error.message || "Failed to start forward");
				}

				const pushData = await pushResponse.json();

				// Step 4: Update state and save to Nostr
				setConfig((prev) => {
					const newConfig = {
						...prev,
						[platform]: {
							...prev[platform],
							...updatedPlatformConfig,
							isLive: true,
							pushId: pushData.pushId,
						},
					};
					saveConfig(newConfig);
					return newConfig;
				});

				pushListQuery.refetch();
			} catch (error) {
				console.error(`Failed to start forward to ${platform}:`, error);
				setForwardError(
					error instanceof Error ? error.message : "Failed to start forward",
				);
			} finally {
				setBroadcastCreating((prev) => {
					const next = new Set(prev);
					next.delete(platform);
					return next;
				});
			}
		},
		[isStreaming, streamId, config, presetData, saveConfig, pushListQuery],
	);

	// Start forwarding to all enabled platforms at once
	const handleStartAllForward = useCallback(async () => {
		if (!isStreaming || !streamId) {
			setForwardError("Please start your main stream first before forwarding.");
			return;
		}

		const connectedPlatforms = (
			["youtube", "facebook", "twitch", "tiktok"] as const
		).filter(
			(p) => !config[p].isLive && (config[p].accessToken),
		);

		if (connectedPlatforms.length === 0) {
			setForwardError(
				"No platforms are connected and ready. Connect at least one platform first.",
			);
			return;
		}

		setForwardError(null);
		await Promise.allSettled(
			connectedPlatforms.map((p) => handleStartForward(p)),
		);
	}, [isStreaming, streamId, config, handleStartForward]);

	const handleStopForward = useCallback(async (platform: keyof ForwardStreamConfig) => {
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
				const error = await response
					.json()
					.catch(() => ({ message: "Failed to stop forward" }));
				throw new Error(error.message || "Failed to stop forward");
			}

			setConfig((prev) => {
				const newConfig = {
					...prev,
					[platform]: {
						...prev[platform],
						isLive: false,
						pushId: undefined,
						broadcastId: undefined,
					},
				};
				saveConfig(newConfig);
				return newConfig;
			});

			// Refetch push list
			pushListQuery.refetch();
		} catch (error) {
			console.error(`Failed to stop forward to ${platform}:`, error);
			setForwardError(
				error instanceof Error ? error.message : "Failed to stop forward",
			);
		}
	}, [config, saveConfig, pushListQuery]);

	// Stop forwarding all live platforms at once
	const handleStopAllForward = useCallback(async () => {
		const livePlatforms = (["youtube", "facebook", "twitch", "tiktok"] as const).filter(
			(p) => config[p].isLive && config[p].pushId,
		);

		if (livePlatforms.length === 0) return;

		setForwardError(null);
		await Promise.allSettled(livePlatforms.map((p) => handleStopForward(p)));
	}, [config, handleStopForward]);

	// Check if any platform is currently forwarding
	const hasLivePlatforms = useMemo(
		() => (["youtube", "facebook", "twitch", "tiktok"] as const).some((p) => config[p].isLive),
		[config],
	);

	const renderPlatformSettings = (platform: keyof ForwardStreamConfig) => {
		const platformConfig = config[platform];
		const isConnecting = connectingPlatforms.has(platform);
		const isCreatingBroadcast = broadcastCreating.has(platform);
		const isConnected = !!platformConfig.accessToken || !!platformConfig.streamKey;
		const hasStreamCredentials = !!platformConfig.streamKey;
		const isDeferredCredentialPlatform = platform === "facebook" || platform === "tiktok";

		return (
			<Accordion key={platform}>
				<AccordionSummary expandIcon={<ExpandMoreIcon />}>
					<Box
						display="flex"
						alignItems="center"
						gap={1}
						width="100%"
						mr={2}
					>
						{getPlatformIcon(platform)}
						<Typography>{getPlatformName(platform)}</Typography>
						{platformConfig.isLive ? (
							<Chip
								label="LIVE"
								color="error"
								size="small"
								sx={{ animation: `${pulse} 2s infinite` }}
							/>
						) : isConnected ? (
							<Chip
								label="Connected"
								color="success"
								size="small"
								variant="outlined"
							/>
						) : (
							<Chip
								label="Not Connected"
								size="small"
								variant="outlined"
							/>
						)}
					</Box>
				</AccordionSummary>
				<AccordionDetails>
					<Stack spacing={2}>
						{isConnected ? (
							<>
								{hasStreamCredentials ? (
									<>
										<TextField
											fullWidth
											label="Server URL"
											value={platformConfig.serverUrl}
											size="small"
											slotProps={{
												input: {
													readOnly: true,
													endAdornment: (
														<InputAdornment position="end">
															<Tooltip title="Copy Server URL">
																<IconButton
																	size="small"
																	onClick={() =>
																		handleCopyToClipboard(
																			platformConfig.serverUrl,
																		)
																	}
																>
																	<ContentCopyIcon fontSize="small" />
																</IconButton>
															</Tooltip>
														</InputAdornment>
													),
												},
											}}
										/>
										<TextField
											fullWidth
											label="Stream Key"
											type="password"
											value={platformConfig.streamKey}
											size="small"
											slotProps={{
												input: {
													readOnly: true,
													endAdornment: (
														<InputAdornment position="end">
															<Tooltip title="Copy Stream Key">
																<IconButton
																	size="small"
																	onClick={() =>
																		handleCopyToClipboard(
																			platformConfig.streamKey,
																		)
																	}
																>
																	<ContentCopyIcon fontSize="small" />
																</IconButton>
															</Tooltip>
														</InputAdornment>
													),
												},
											}}
										/>
									</>
								) : isDeferredCredentialPlatform ? (
									<Alert severity="success" variant="outlined">
										Connected — credentials will be created when you start forwarding.
									</Alert>
								) : null}
							</>
						) : (
							<Alert severity="info" variant="outlined">
								Connect your {getPlatformName(platform)} account to get started.
							</Alert>
						)}

						<Stack direction="row" spacing={1}>
							{isConnected ? (
								<Tooltip
									title={
										platformConfig.isLive
											? "Stop forwarding before disconnecting"
											: ""
									}
								>
									<span>
										<Button
											variant="outlined"
											color="error"
											size="small"
											startIcon={<LinkOffIcon />}
											onClick={() => handleDisconnect(platform)}
											disabled={platformConfig.isLive}
										>
											Disconnect
										</Button>
									</span>
								</Tooltip>
							) : (
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
									disabled={isConnecting}
								>
									{isConnecting
										? "Connecting..."
										: `Connect ${getPlatformName(platform)}`}
								</Button>
							)}
						</Stack>

						{isConnected && (
							<Box>
								{!platformConfig.isLive ? (
									<Button
										variant="contained"
										color="success"
										startIcon={
											isCreatingBroadcast ? (
												<CircularProgress size={16} color="inherit" />
											) : (
												<PlayArrowIcon />
											)
										}
										onClick={() => handleStartForward(platform)}
										disabled={isCreatingBroadcast}
										fullWidth
									>
										{isCreatingBroadcast ? "Creating Broadcast…" : "Start Forward"}
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
						)}
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
				{isSaving && <CircularProgress size={20} sx={{ ml: 1 }} />}
			</Box>

			{configQuery.isLoading ? (
				<Box display="flex" justifyContent="center" p={4}>
					<CircularProgress />
				</Box>
			) : (
				<>
					{!isStreaming && (
						<Alert severity="info" sx={{ mb: 2 }}>
							Start your main stream first to enable forwarding to other
							platforms.
						</Alert>
					)}

					{forwardError && (
						<Alert
							severity="error"
							sx={{ mb: 2 }}
							onClose={() => setForwardError(null)}
						>
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
								sx={{ animation: `${pulse} 2s infinite` }}
							/>
						) : (
							<Chip label="OFFLINE" size="small" />
						)}
						{isLiveStatusLoading && <CircularProgress size={16} />}
					</Box>

					{isStreaming && (
						<Stack direction="row" spacing={1} sx={{ mb: 2 }}>
							<Button
								variant="contained"
								color="success"
								startIcon={<PlayArrowIcon />}
								onClick={handleStartAllForward}
								fullWidth
							>
								Start All Forward
							</Button>
							{hasLivePlatforms && (
								<Button
									variant="contained"
									color="error"
									startIcon={<StopCircleIcon />}
									onClick={handleStopAllForward}
									fullWidth
								>
									Stop All Forward
								</Button>
							)}
						</Stack>
					)}

					<Stack spacing={1}>
						{renderPlatformSettings("youtube")}
						{renderPlatformSettings("facebook")}
						{renderPlatformSettings("twitch")}
						{renderPlatformSettings("tiktok")}
					</Stack>
				</>
			)}

			{decryptError && (
				<Alert severity="warning" sx={{ mt: 2 }} onClose={() => setDecryptError(false)}>
					Could not load your saved stream config. Using defaults — your previous settings may need to be
					re-entered.
				</Alert>
			)}

			<Snackbar
				open={snackbar.open}
				autoHideDuration={3000}
				onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
				message={snackbar.message}
				ContentProps={{
					sx: {
						bgcolor: snackbar.severity === "error" ? "error.main" : "success.main",
						color: "white",
					},
				}}
			/>
		</Paper>
	);
}
