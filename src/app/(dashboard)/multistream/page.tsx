"use client";
import * as React from "react";
import { Container } from "@mui/material";
import ForwardStreamSettings from "@/component/ForwardStreamSettings";

export default function MultistreamPage() {
	return (
		<Container maxWidth="lg" disableGutters>
			<ForwardStreamSettings />
		</Container>
	);
}
