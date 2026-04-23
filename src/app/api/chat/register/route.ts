import { NextRequest, NextResponse } from "next/server";
import type { ChatPlatform } from "@/lib/chat/types";
import { registerChat, unregisterChat, unregisterAll } from "@/lib/chat/store";

const VALID_PLATFORMS: ChatPlatform[] = ["youtube", "twitch", "facebook", "tiktok"];

interface RegisterRequest {
	npub: string;
	platform: ChatPlatform;
	accessToken: string;
	chatId?: string;
	broadcastId?: string;
	channelName?: string;
	ssnSessionId?: string;
}

interface UnregisterRequest {
	npub: string;
	platform?: ChatPlatform;
}

export async function POST(request: NextRequest) {
	let body: RegisterRequest;
	try {
		body = (await request.json()) as RegisterRequest;
	} catch {
		return NextResponse.json({ error: "invalid_body", message: "Request body must be valid JSON" }, { status: 400 });
	}

	if (!body.npub || !body.platform) {
		return NextResponse.json(
			{ error: "missing_fields", message: "npub and platform are required" },
			{ status: 400 },
		);
	}

	// TikTok uses SSN session ID instead of access token
	if (body.platform === "tiktok") {
		if (!body.ssnSessionId) {
			return NextResponse.json(
				{ error: "missing_fields", message: "ssnSessionId is required for TikTok" },
				{ status: 400 },
			);
		}
	} else if (!body.accessToken) {
		return NextResponse.json(
			{ error: "missing_fields", message: "accessToken is required" },
			{ status: 400 },
		);
	}

	if (!VALID_PLATFORMS.includes(body.platform)) {
		return NextResponse.json(
			{ error: "invalid_platform", message: `platform must be one of: ${VALID_PLATFORMS.join(", ")}` },
			{ status: 400 },
		);
	}

	registerChat({
		npub: body.npub,
		platform: body.platform,
		accessToken: body.accessToken,
		chatId: body.chatId,
		broadcastId: body.broadcastId,
		channelName: body.channelName,
		ssnSessionId: body.ssnSessionId,
	});

	return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
	let body: UnregisterRequest;
	try {
		body = (await request.json()) as UnregisterRequest;
	} catch {
		return NextResponse.json({ error: "invalid_body", message: "Request body must be valid JSON" }, { status: 400 });
	}

	if (!body.npub) {
		return NextResponse.json({ error: "missing_fields", message: "npub is required" }, { status: 400 });
	}

	if (body.platform) {
		if (!VALID_PLATFORMS.includes(body.platform)) {
			return NextResponse.json(
				{ error: "invalid_platform", message: `platform must be one of: ${VALID_PLATFORMS.join(", ")}` },
				{ status: 400 },
			);
		}
		unregisterChat(body.npub, body.platform);
	} else {
		unregisterAll(body.npub);
	}

	return NextResponse.json({ success: true });
}
