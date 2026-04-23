"use client";
import React, { FormEvent, useMemo } from "react";
import {
	Alert,
	Box,
	Button,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	TextField,
	Typography,
} from "@mui/material";
import { useActiveUser, useNdk } from "nostr-hooks";
import { useQuery } from "@tanstack/react-query";
import NDK, { NDKEvent, NDKKind, NDKUser } from "@nostr-dev-kit/ndk";
import TagsBox from "./TagsBox";

type QueryKey = [string, { ndk?: NDK; activeUser?: NDKUser | null }];
type QueryResult = NDKEvent | null;

export default function EditStreamingInfo() {
	const [open, setOpen] = React.useState(false);
	const [busy, setBusy] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const handleOpen = () => setOpen(true);
	const handleClose = () => {
		setError(null);
		setOpen(false);
	};
	const { ndk } = useNdk();
	const { activeUser } = useActiveUser();

	const info = useQuery<unknown, unknown, QueryResult, QueryKey>({
		queryKey: ["edit-live-info", { ndk, activeUser }],
		enabled: open && !!ndk && !!activeUser,
		queryFn: async ({ queryKey }) => {
			const { ndk, activeUser } = queryKey[1];
			return ndk!.fetchEvent([
				{
					limit: 1,
					kinds: [30311 as NDKKind],
					"#p": [activeUser!.pubkey],
				},
				{
					limit: 1,
					kinds: [30311 as NDKKind],
					authors: [activeUser!.pubkey],
				},
			]);
		},
	});

	// Stable reference: only recompute when a different event (different id) is loaded,
	// so the TagsBox isn't reset on every background refetch.
	const initialTags = useMemo(
		() => info.data?.getMatchingTags("t").map((t) => t[1]),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[info.data?.id],
	);

	const handleSubmit = async (evt: FormEvent<HTMLDivElement>) => {
		evt.preventDefault();
		if (!ndk || !activeUser || !info.data) return;

		const target = evt.nativeEvent.target as HTMLFormElement;
		const form = new FormData(target);

		const newTitle = form.get("title")?.toString() || "";
		const newSummary = form.get("summary")?.toString() || "";
		const newImage = form.get("image")?.toString() || "";
		const newTagsStr = form.get("tags")?.toString() || "";
		const newHashtags = newTagsStr
			? newTagsStr
					.split(",")
					.map((t) => t.trim())
					.filter(Boolean)
			: [];

		// Preserve structural tags (d, status, streaming, p, etc.)
		// and replace display tags (title, summary, image, t)
		const displayTagKeys = new Set(["title", "summary", "image", "t"]);
		const preservedTags = info.data.tags.filter(
			(tag) => !displayTagKeys.has(tag[0]),
		);

		const updatedTags: string[][] = [
			...preservedTags,
			...(newTitle ? [["title", newTitle]] : []),
			...(newSummary ? [["summary", newSummary]] : []),
			...(newImage ? [["image", newImage]] : []),
			...newHashtags.map((t) => ["t", t]),
		];

		const event = new NDKEvent(ndk, {
			kind: 30311 as NDKKind,
			content: "",
			pubkey: activeUser.pubkey,
			tags: updatedTags,
			created_at: Math.floor(Date.now() / 1000),
		});

		setBusy(true);
		setError(null);
		try {
			await event.publish();
			handleClose();
		} catch (e) {
			setError(e instanceof Error ? e.message : "Failed to save streaming info. Please try again.");
		} finally {
			setBusy(false);
		}
	};

	return (
		<>
			<Button
				onClick={handleOpen}
				color="primary"
				variant="contained"
				sx={{ textTransform: "none" }}
			>
				Edit Streaming Info
			</Button>
			<Dialog
				open={open}
				onClose={handleClose}
				fullWidth
				maxWidth="sm"
				component="form"
				onSubmit={handleSubmit}
			>
				<DialogTitle>{"Edit Streaming Info"}</DialogTitle>
				<DialogContent>
					{error && (
						<Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
							{error}
						</Alert>
					)}
					{info.isLoading ? (
						<CircularProgress />
					) : info.data ? (
						<Box display="flex" flexDirection="column">
							<TextField
								name="title"
								label="Title"
								defaultValue={info.data?.tagValue("title")}
								disabled={busy}
								required
								slotProps={{ htmlInput: { maxLength: 100 } }}
							/>
							<TextField
								name="summary"
								label="Summary"
								defaultValue={info.data?.tagValue("summary")}
								multiline
								rows={3}
								disabled={busy}
								slotProps={{ htmlInput: { maxLength: 500 } }}
							/>
							<TextField
								name="image"
								label="Cover Image"
								defaultValue={info.data?.tagValue("image")}
								disabled={busy}
								slotProps={{ htmlInput: { maxLength: 500 } }}
								placeholder="https://..."
								type="url"
							/>
							<TagsBox name="tags" initialValues={initialTags} disabled={busy} />
						</Box>
					) : (
						<Typography>No streaming.</Typography>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={handleClose} disabled={busy}>
						Cancel
					</Button>
					<Button type="submit" disabled={!info.data || info.isFetching} loading={busy}>
						Save
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
}
