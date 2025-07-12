import React, { FormEvent, useMemo } from "react";
import {
	Box,
	Button,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	TextField,
} from "@mui/material";
import { useActiveUser, useNdk } from "nostr-hooks";
import { useQuery } from "@tanstack/react-query";
import { default as NDK, NDKEvent, NDKUser } from "@nostr-dev-kit/ndk";
import TagsBox from "./TagsBox";

type QueryKey = [string, { ndk?: NDK; activeUser?: NDKUser | null }];
type QueryResult = NDKEvent | null;

export default function PresetSettings() {
	const [open, setOpen] = React.useState(false);
	const [busy, setBusy] = React.useState(false);
	const handleOpen = () => setOpen(true);
	const handleClose = () => setOpen(false);
	const { ndk } = useNdk();
	const { activeUser } = useActiveUser();

	const info = useQuery<unknown, unknown, QueryResult, QueryKey>({
		queryKey: ["edit-live-presets", { ndk, activeUser }],
		enabled: open && !!ndk && !!activeUser,
		queryFn: async ({ queryKey }) => {
			const { ndk, activeUser } = queryKey[1];
			return ndk!.fetchEvent({
				limit: 1,
				kinds: [30078],
				"#d": ["beamlivestudio-config"],
				authors: [activeUser!.pubkey],
			});
		},
	});

	const data = useMemo(
		() => JSON.parse(info.data?.content || "{}"),
		[info.data?.content]
	);

	const handleSubmit = async (evt: FormEvent<HTMLDivElement>) => {
		evt.preventDefault();
		const target = evt.nativeEvent.target as HTMLFormElement;
		const form = new FormData(target);

		const values = {
			title: form.get("title"),
			summary: form.get("summary"),
			image: form.get("image"),
			tags: form.get("tags")?.toString().split(","),
		};
		const event = new NDKEvent(ndk, {
			kind: 30078,
			content: JSON.stringify({ ...data, ...values }),
			pubkey: activeUser?.pubkey,
			tags: [["d", "beamlivestudio-config"]],
		});
		setBusy(true);
		await event.publish();
		setBusy(false);
		handleClose();
	};

	return (
		<>
			<Button
				onClick={handleOpen}
				color="primary"
				variant="contained"
				sx={{ textTransform: "none" }}
			>
				Preset Settings
			</Button>
			<Dialog
				open={open}
				onClose={handleClose}
				fullWidth
				maxWidth="sm"
				component="form"
				onSubmit={handleSubmit}
			>
				<DialogTitle>{"Preset Settings"}</DialogTitle>
				<DialogContent>
					{info.isFetching ? (
						<CircularProgress />
					) : (
						<Box display="flex" flexDirection="column">
							<TextField
								name="title"
								label="Title"
								defaultValue={data.title}
								disabled={busy}
							/>
							<TextField
								name="summary"
								label="Summary"
								defaultValue={data.summary}
								multiline
								rows={3}
								disabled={busy}
							/>
							<TextField
								name="image"
								label="Cover Image"
								defaultValue={data.image}
								disabled={busy}
							/>
							<TagsBox name="tags" initialValues={data.tags} disabled={busy} />
						</Box>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={handleClose} disabled={busy}>
						Cancel
					</Button>
					<Button type="submit" loading={busy}>
						Save
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
}
