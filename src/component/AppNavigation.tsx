"use client";
import * as React from "react";
import {
	AppBar,
	Toolbar,
	Typography,
	Box,
	Paper,
	Tabs,
	Tab,
} from "@mui/material";
import WidgetsIcon from "@mui/icons-material/Widgets";
import SettingsInputAntennaIcon from "@mui/icons-material/SettingsInputAntenna";
import CastConnectedIcon from "@mui/icons-material/CastConnected";
import { useRouter, usePathname } from "next/navigation";
import { useRealtimeProfile, useActiveUser } from "nostr-hooks";
import ProfileMenuButton from "./ProfileMenuButton";

const tabs = [
	{ path: "/", label: "Stream Config", icon: <SettingsInputAntennaIcon /> },
	{ path: "/multistream", label: "Multistream", icon: <CastConnectedIcon /> },
	{ path: "/widgets", label: "Widgets", icon: <WidgetsIcon /> },
];

export default function AppNavigation() {
	const router = useRouter();
	const pathname = usePathname();
	const { activeUser } = useActiveUser();
	const { profile } = useRealtimeProfile(activeUser?.pubkey);

	// Find current tab index based on pathname
	const currentTabIndex = React.useMemo(() => {
		const index = tabs.findIndex((tab) => tab.path === pathname);
		return index >= 0 ? index : 0;
	}, [pathname]);

	const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
		router.push(tabs[newValue].path);
	};

	return (
		<>
			{/* App Bar */}
			<AppBar position="static" sx={{ zIndex: 1100 }}>
				<Toolbar>
					<Typography variant="h6" sx={{ fontWeight: 600 }}>
						Live Studio
					</Typography>
					<Box flex={1} />
					{profile && <ProfileMenuButton profile={profile} />}
				</Toolbar>
			</AppBar>

			{/* Tabs Navigation */}
			<Paper square elevation={1}>
				<Tabs
					value={currentTabIndex}
					onChange={handleTabChange}
					variant="fullWidth"
					indicatorColor="primary"
					textColor="primary"
				>
					{tabs.map((tab) => (
						<Tab
							key={tab.path}
							icon={tab.icon}
							label={tab.label}
							iconPosition="start"
						/>
					))}
				</Tabs>
			</Paper>
		</>
	);
}
