"use client";
import * as React from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import {
	Container,
	Paper,
	Button,
	TextField,
	Divider,
	Alert,
	IconButton,
	InputAdornment,
	Collapse,
	Chip,
} from "@mui/material";
import {
	Visibility,
	VisibilityOff,
	Extension,
	Key,
	ExpandMore,
	ExpandLess,
	Videocam,
} from "@mui/icons-material";

interface LoginScreenProps {
	onLoginWithExtension: () => void;
	onLoginWithPrivateKey: (privateKey: string) => void;
	extensionDisabled?: boolean;
}

export default function LoginScreen({
	onLoginWithExtension,
	onLoginWithPrivateKey,
	extensionDisabled,
}: LoginScreenProps) {
	const [privateKey, setPrivateKey] = React.useState("");
	const [showPrivateKey, setShowPrivateKey] = React.useState(false);
	const [showPrivateKeyLogin, setShowPrivateKeyLogin] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	const handlePrivateKeyLogin = () => {
		if (!privateKey.trim()) {
			setError("Please enter your private key");
			return;
		}

		// Basic validation for nsec or hex format
		const trimmedKey = privateKey.trim();
		const isNsec = trimmedKey.startsWith("nsec1");
		const isHex = /^[0-9a-fA-F]{64}$/.test(trimmedKey);

		if (!isNsec && !isHex) {
			setError("Invalid private key format. Please use nsec or hex format.");
			return;
		}

		setError(null);
		onLoginWithPrivateKey(trimmedKey);
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			handlePrivateKeyLogin();
		}
	};

	return (
		<Box
			sx={{
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
				minHeight: "100vh",
				backgroundColor: "background.default",
				padding: { xs: 2, sm: 3 },
			}}
		>
			<Container maxWidth="xs">
				<Paper
					elevation={0}
					sx={{
						padding: { xs: 3, sm: 4 },
						textAlign: "center",
						width: "100%",
						borderRadius: 3,
					}}
				>
					{/* Logo Placeholder */}
					<Box
						sx={{
							width: 64,
							height: 64,
							mx: "auto",
							mb: 2,
							borderRadius: 2,
							background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<Videocam sx={{ fontSize: 32, color: "white" }} />
					</Box>
					<Typography
						variant="h5"
						component="h1"
						fontWeight={600}
						sx={{ color: "text.primary", mb: 0.5 }}
					>
						Beam Live Studio
					</Typography>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
						Stream live on Nostr
					</Typography>

					{/* Extension Login - Recommended */}
					<Button
						fullWidth
						variant="contained"
						color="primary"
						size="large"
						disabled={extensionDisabled}
						onClick={onLoginWithExtension}
						startIcon={<Extension />}
						sx={{
							mb: 1.5,
							py: 1.5,
							textTransform: "none",
							fontSize: "1rem",
						}}
					>
						Continue with Extension
					</Button>

					{extensionDisabled ? (
						<Typography
							variant="caption"
							color="text.secondary"
							sx={{ display: "block", mb: 3 }}
						>
							No extension detected.{" "}
							<Box
								component="a"
								href="https://getalby.com"
								target="_blank"
								rel="noopener noreferrer"
								sx={{ color: "primary.main" }}
							>
								Get Alby
							</Box>{" "}
							or{" "}
							<Box
								component="a"
								href="https://github.com/nickytonline/nos2x"
								target="_blank"
								rel="noopener noreferrer"
								sx={{ color: "primary.main" }}
							>
								nos2x
							</Box>
						</Typography>
					) : (
						<Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
							<Chip
								label="Recommended"
								size="small"
								color="success"
								variant="outlined"
								sx={{ fontSize: "0.7rem" }}
							/>
						</Box>
					)}

					{/* Divider */}
					<Divider sx={{ my: 2 }}>
						<Typography variant="caption" color="text.secondary">
							or
						</Typography>
					</Divider>

					{/* Private Key Login - Collapsible */}
					<Button
						fullWidth
						variant="text"
						color="inherit"
						onClick={() => setShowPrivateKeyLogin(!showPrivateKeyLogin)}
						endIcon={showPrivateKeyLogin ? <ExpandLess /> : <ExpandMore />}
						sx={{
							textTransform: "none",
							color: "text.secondary",
							mb: 1,
						}}
					>
						Sign in with Private Key
					</Button>

					<Collapse in={showPrivateKeyLogin}>
						<Box sx={{ pt: 2 }}>
							{error && (
								<Alert
									severity="error"
									sx={{ mb: 2, textAlign: "left" }}
									onClose={() => setError(null)}
								>
									{error}
								</Alert>
							)}

							<TextField
								fullWidth
								size="small"
								placeholder="nsec1... or hex"
								type={showPrivateKey ? "text" : "password"}
								value={privateKey}
								onChange={(e) => {
									setPrivateKey(e.target.value);
									setError(null);
								}}
								onKeyDown={handleKeyPress}
								slotProps={{
									input: {
										startAdornment: (
											<InputAdornment position="start">
												<Key fontSize="small" color="action" />
											</InputAdornment>
										),
										endAdornment: (
											<InputAdornment position="end">
												<IconButton
													aria-label="toggle private key visibility"
													onClick={() => setShowPrivateKey(!showPrivateKey)}
													edge="end"
													size="small"
												>
													{showPrivateKey ? (
														<VisibilityOff fontSize="small" />
													) : (
														<Visibility fontSize="small" />
													)}
												</IconButton>
											</InputAdornment>
										),
									},
								}}
								sx={{ mb: 2 }}
							/>

							<Button
								fullWidth
								variant="outlined"
								color="primary"
								onClick={handlePrivateKeyLogin}
								disabled={!privateKey.trim()}
								sx={{
									mb: 2,
									textTransform: "none",
								}}
							>
								Sign In
							</Button>

							<Alert
								severity="warning"
								icon={false}
								sx={{
									textAlign: "left",
									"& .MuiAlert-message": { width: "100%" },
								}}
							>
								<Typography variant="caption" color="text.secondary">
									⚠️ Your private key will be stored in the browser. For better
									security, use a browser extension instead.
								</Typography>
							</Alert>
						</Box>
					</Collapse>
				</Paper>

				{/* Footer */}
				<Typography
					variant="caption"
					color="text.secondary"
					sx={{ display: "block", textAlign: "center", mt: 3 }}
				>
					By signing in, you agree to broadcast events to Nostr relays.
				</Typography>
			</Container>
		</Box>
	);
}
