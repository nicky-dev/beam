import { CopyAll } from "@mui/icons-material";
import {
	IconButton,
	InputAdornment,
	TextField,
	TextFieldProps,
} from "@mui/material";
import { useState } from "react";

const streamUrl = "rtmp://beam.mapboss.co.th/live";
export default function StreamUrlBox(props: TextFieldProps) {
	const [value] = useState(streamUrl);
	return (
		<TextField
			{...props}
			label="Stream URL"
			autoComplete="off"
			sx={{ pr: 0, ...props.sx }}
			value={value}
			slotProps={{
				input: {
					endAdornment: (
						<InputAdornment position="end">
							<IconButton onClick={() => copyTextToClipboard(value)}>
								<CopyAll />
							</IconButton>
						</InputAdornment>
					),
				},
			}}
		/>
	);
}

async function copyTextToClipboard(textToCopy: string) {
	try {
		await navigator.clipboard.writeText(textToCopy);
		console.log("Text copied to clipboard successfully!");
	} catch (err) {
		console.error("Failed to copy text: ", err);
		// Fallback for older browsers or environments where Clipboard API is not available
		// (e.g., using document.execCommand('copy') with a temporary textarea)
		// This fallback is more complex and not always reliable, so it's often omitted
		// if targeting modern browsers.
	}
}
