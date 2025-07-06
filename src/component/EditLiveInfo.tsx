import React, { useEffect, useMemo, useState } from "react";
import {
	Box,
	Button,
	Chip,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Stack,
	TextField,
	Typography,
} from "@mui/material";
import { useActiveUser, useNdk } from "nostr-hooks";
import { useQuery } from "@tanstack/react-query";
import NDK, { NDKEvent, NDKKind, NDKUser } from "@nostr-dev-kit/ndk";
import TagsBox from "./TagsBox";

type QueryKey = [string, { ndk?: NDK; activeUser?: NDKUser | null }];
type QueryResult = NDKEvent | null;

export default function EditLiveInfo() {
	const [open, setOpen] = React.useState(false);
	const handleOpen = () => setOpen(true);
	const handleClose = () => setOpen(false);
	const { ndk } = useNdk();
	const { activeUser } = useActiveUser();

	const info = useQuery<any, any, QueryResult, QueryKey>({
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

	return (
		<>
			<Button
				onClick={handleOpen}
				color="primary"
				variant="contained"
				sx={{ textTransform: "none" }}
			>
				Edit Live Info
			</Button>
			<Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
				<DialogTitle>{"Edit Live Info"}</DialogTitle>
				<DialogContent>
					{info.isFetching ? (
						<CircularProgress />
					) : (
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
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={handleClose}>Cancel</Button>
					<Button onClick={handleClose}>Save</Button>
				</DialogActions>
			</Dialog>
		</>
	);
}
