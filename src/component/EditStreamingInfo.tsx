import React, { FormEvent } from "react";
import {
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
	const handleOpen = () => setOpen(true);
	const handleClose = () => setOpen(false);
	const { ndk } = useNdk();
	const { activeUser } = useActiveUser();

	const info = useQuery<unknown, unknown, QueryResult, QueryKey>({
		queryKey: ["edit-live-info", { ndk, activeUser }],
		enabled: open && !!ndk && !!activeUser,
		queryFn: async ({ queryKey }) => {
			const { ndk, activeUser } = queryKey[1];
			return ndk!.fetchEvent({
				limit: 1,
				kinds: [30311 as NDKKind],
				"#p": [activeUser!.pubkey],
			});
		},
	});

	const handleSubmit = async (evt: FormEvent<HTMLDivElement>) => {
		evt.preventDefault();
		// const target = evt.nativeEvent.target as HTMLFormElement;
		// const form = new FormData(target);

		// const values = {
		// 	title: form.get("title"),
		// 	summary: form.get("summary"),
		// 	image: form.get("image"),
		// 	tags: form.get("tags")?.toString().split(","),
		// };
		// const event = new NDKEvent(ndk, {
		// 	kind: 30311 as NDKKind,
		// 	content: "",
		// 	pubkey: activeUser?.pubkey,
		// 	tags: [["d", "beamlivestudio-config"]],
		// });
		setBusy(true);
		// await event.publish();
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
					{info.isFetching ? (
						<CircularProgress />
					) : info.data ? (
						<Box display="flex" flexDirection="column">
							<TextField
								name="title"
								label="Title"
								defaultValue={info.data?.tagValue("title")}
							/>
							<TextField
								name="summary"
								label="Summary"
								defaultValue={info.data?.tagValue("summary")}
								multiline
								rows={3}
							/>
							<TextField
								name="image"
								label="Cover Image"
								defaultValue={info.data?.tagValue("image")}
							/>
							<TagsBox
								initialValues={info.data?.getMatchingTags("t").map((t) => t[1])}
							/>
						</Box>
					) : (
						<Typography>No streaming.</Typography>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={handleClose} disabled={busy}>
						Cancel
					</Button>
					<Button type="submit" disabled={true} loading={busy}>
						Save
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
}
