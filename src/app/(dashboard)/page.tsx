"use client";
import * as React from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { Container, Paper } from "@mui/material";
import StreamKeyBox from "@/component/StreamKeyBox";
import StreamUrlBox from "@/component/StreamUrlBox";
import PresetSettings from "@/component/PresetSettings";
import EditStreamingInfo from "@/component/EditStreamingInfo";

export default function Home() {
	return (
		<Container maxWidth="lg" disableGutters>
			<Box display="flex" flexDirection="column" gap={3}>
				<Paper elevation={0} sx={{ p: 3 }}>
					<Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
						Stream Server
					</Typography>
					<Box display="flex" flexDirection="column" gap={2}>
						<StreamUrlBox />
						<StreamKeyBox />
					</Box>
				</Paper>

				<Paper elevation={0} sx={{ p: 3 }}>
					<Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
						Stream Settings
					</Typography>
					<Box
						display="grid"
						gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr" }}
						gap={2}
					>
						<PresetSettings />
						<EditStreamingInfo />
					</Box>
				</Paper>
			</Box>
		</Container>
	);
}
