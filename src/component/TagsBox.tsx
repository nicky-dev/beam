import React, { useEffect, useMemo, useState } from "react";
import { Chip, InputAdornment, Stack, TextField } from "@mui/material";

export default function TagsBox(props: {
	name?: string;
	initialValues?: string[];
}) {
	const [tagText, setTagText] = useState("");
	const [tagsText, setTagsText] = useState("");

	const tags = useMemo(
		() => tagsText?.split(",").filter((d: string) => !!d.trim()) || [],
		[tagsText]
	);

	useEffect(() => {
		if (!props.initialValues) return;
		setTagsText(props.initialValues.join(","));
	}, [props.initialValues]);

	return (
		<>
			<input type="hidden" name={props.name} value={tagsText} />
			<TextField
				value={tagText}
				onPaste={(evt) => {
					evt.preventDefault();
					const data = evt.clipboardData.getData("text");
					const tagsText = Array.from(
						new Set([...tags, ...data.split(",").map((d) => d.trim())])
					).join(",");
					if (tagsText.length === 0) return;
					setTagsText(tagsText);
				}}
				onChange={(evt) => {
					if (evt.target.value.endsWith(",")) return;
					setTagText(evt.target.value);
				}}
				onKeyDown={(evt) => {
					if (evt.key === ",") {
						evt.preventDefault();
						if (tags.includes(tagText)) {
							return;
						}
						setTagsText(
							Array.from(
								new Set([...tags, ...tagText.split(",").map((d) => d.trim())])
							).join(",")
						);
						setTagText("");
					}
				}}
				label="Tags"
				placeholder="thai, gaming, siamstr"
				fullWidth
				autoComplete="off"
				multiline
				maxRows={6}
				slotProps={{
					inputLabel: {
						shrink: true,
					},
					input: {
						sx: {
							flexDirection: "column",
							alignItems: "flex-start",
						},
						startAdornment: tags[0] ? (
							<InputAdornment
								position="start"
								sx={{
									minHeight: 32,
									maxHeight: "none",
									height: "auto",
									mb: 1,
								}}
							>
								<Stack direction="row" gap={0.5} flexWrap="wrap">
									{tags.map((d: string) => {
										return (
											<Chip
												key={d}
												label={d}
												onDelete={(e) => {
													setTagsText(
														tags.filter((_d: string) => _d !== d).join(",")
													);
												}}
											/>
										);
									})}
								</Stack>
							</InputAdornment>
						) : undefined,
					},
				}}
			/>
		</>
	);
}
