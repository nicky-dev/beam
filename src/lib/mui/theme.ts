"use client";

import { createTheme } from "@mui/material";
import { Noto_Sans_Thai } from "next/font/google";

const font = Noto_Sans_Thai({
	weight: ["300", "400", "500", "700"],
	subsets: ["latin", "thai"],
	// display: "swap",
});

const theme = createTheme({
	colorSchemes: { light: true, dark: true },
	cssVariables: {
		colorSchemeSelector: "class",
	},
	typography: {
		fontFamily: font.style.fontFamily,
	},
	components: {
		MuiInputBase: {
			defaultProps: {
				// size: "small",
				// margin: "dense",
			},
		},
		MuiTextField: {
			defaultProps: {
				margin: "normal",
			},
		},
		MuiButton: {
			defaultProps: {
				size: "small",
			},
		},
	},
});

export default theme;
