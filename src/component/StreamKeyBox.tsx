import { CopyAll } from "@mui/icons-material";
import {
	CircularProgress,
	IconButton,
	InputAdornment,
	TextField,
	TextFieldProps,
} from "@mui/material";
import { useNip98 } from "nostr-hooks";
import { useEffect, useState } from "react";

export default function StreamKeyBox(props: TextFieldProps) {
	const { getToken } = useNip98();
	const [value, setValue] = useState("Generating...");
	const [busy, setBusy] = useState(true);

	useEffect(() => {
		const generate = async () => {
			const token = await getToken({
				url: "/v1/admission",
				method: "POST",
			});
			const streamKey = token?.split(" ").pop();
			if (!streamKey) return;
			setValue(streamKey);
			setBusy(false);
		};
		generate();
	}, [getToken]);
	return (
		<TextField
			{...props}
			label="Stream Key"
			type="password"
			autoComplete="off"
			sx={{ pr: 0, ...props.sx }}
			value={value}
			disabled={busy}
			slotProps={{
				input: {
					startAdornment: busy ? (
						<InputAdornment position="start">
							<CircularProgress />
						</InputAdornment>
					) : undefined,
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
