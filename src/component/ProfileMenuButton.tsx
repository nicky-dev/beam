import React, { useState } from "react";
import {
	Button,
	Menu,
	MenuItem,
	Typography,
	Container,
	Avatar,
} from "@mui/material";
import AccountCircle from "@mui/icons-material/AccountCircle"; // Example icon for a profile button
import { useLogin } from "nostr-hooks";
import { NDKUserProfile } from "@nostr-dev-kit/ndk";

export default function ProfileMenuButton(props: { profile: NDKUserProfile }) {
	const { logout } = useLogin();
	const [anchorEl, setAnchorEl] = useState(null); // State to control the menu's anchor element
	const open = Boolean(anchorEl); // Boolean to check if the menu is open

	// Function to handle opening the menu
	const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
		setAnchorEl(event.currentTarget); // Set the current button as the anchor for the menu
	};

	// Function to handle closing the menu
	const handleMenuClose = () => {
		setAnchorEl(null); // Clear the anchor to close the menu
	};

	const handleLogoutClick = () => {
		logout();
		handleMenuClose();
	};

	return (
		<>
			<Button
				aria-controls="profile-menu"
				aria-haspopup="true"
				onClick={handleMenuOpen}
				color="primary"
				sx={{
					borderRadius: "9999px", // Fully rounded button
					textTransform: "none", // Keep original casing
					px: 2,
				}}
			>
				{!!props.profile?.picture ? (
					<Avatar src={props.profile?.picture} />
				) : (
					<AccountCircle />
				)}
				<Container disableGutters sx={{ textAlign: "left", pl: 1 }}>
					<Typography>
						{props.profile?.displayName || props.profile?.name}
					</Typography>
					{props.profile?.nip05 && (
						<Typography variant="caption">{props.profile?.nip05}</Typography>
					)}
				</Container>
			</Button>
			<Menu
				id="profile-menu"
				anchorEl={anchorEl}
				anchorOrigin={{
					vertical: "bottom", // Position the menu below the anchor
					horizontal: "right",
				}}
				keepMounted
				transformOrigin={{
					vertical: "top", // Align the top of the menu with the anchor's bottom
					horizontal: "right",
				}}
				open={open}
				onClose={handleMenuClose}
			>
				<MenuItem onClick={handleLogoutClick}>Logout</MenuItem>
			</Menu>
		</>
	);
}
