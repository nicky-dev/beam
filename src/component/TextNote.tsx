import { Typography } from "@mui/material";
import { useRealtimeProfile } from "nostr-hooks";
import { nip19 } from "nostr-tools";
import { useMemo } from "react";

interface TextNoteProps {
	content: string;
}

interface NostrEntityTextProps {
	uri: string;
}

interface MentionTextProps {
	pubkey: string;
}

const MentionText: React.FC<MentionTextProps> = ({ pubkey }) => {
	const { profile } = useRealtimeProfile(pubkey);

	const displayName = useMemo(
		() =>
			profile?.displayName ||
			profile?.name ||
			nip19.npubEncode(pubkey).substring(0, 8),
		[profile, pubkey]
	);

	return (
		<Typography
			component="span"
			sx={{ color: "#88eeff", fontWeight: "bold", fontSize: "inherit" }}
		>
			@{displayName}
		</Typography>
	);
};

const NostrEntityText: React.FC<NostrEntityTextProps> = ({ uri }) => {
	const decoded = useMemo(() => {
		try {
			return nip19.decode(uri.replace(/^nostr:/, ""));
		} catch (e) {
			console.error("🚫 เกิดข้อผิดพลาดในการถอดรหัส NIP-21 URI:", uri, e);
			return null; // ถอดรหัสล้มเหลว
		}
	}, [uri]);

	let displayContent: React.ReactNode = uri; // ค่าเริ่มต้นเป็น URI ดิบ
	switch (decoded?.type) {
		case "npub":
		case "nprofile":
			const pubkey =
				decoded.type === "npub"
					? decoded.data.toString()
					: (decoded.data as { pubkey: string }).pubkey;
			return <MentionText pubkey={pubkey} />; // ใช้คอมโพเนนต์ MentionText เพื่อแสดงชื่อผู้ใช้
		case "note":
		case "nevent":
			// สำหรับ Note/Event, แสดง ID แบบย่อ
			const id =
				decoded.type === "note"
					? decoded.data.toString()
					: (decoded.data as { id: string }).id;
			displayContent = `${decoded.type}1${id.substring(0, 4)}`;
			break;
		// สามารถเพิ่ม case สำหรับ 'naddr', 'nrelay' ได้ถ้าต้องการ
		default:
			displayContent = uri; // รูปแบบอื่น ๆ ที่ไม่รองรับ
			break;
	}

	return (
		<Typography
			component="span"
			sx={{ color: "#88eeff", fontWeight: "bold", wordBreak: "break-all" }}
		>
			{displayContent}
		</Typography>
	);
};

export default function TextNote({ content }: TextNoteProps) {
	// --- ตรรกะสำหรับจัดรูปแบบเนื้อหาข้อความ (NIP-21 Mentions) ---
	const formattedContent = useMemo(() => {
		const parts: React.ReactNode[] = [];
		let lastIndex = 0;

		// Regex สำหรับค้นหา NIP-21 URIs และรูปแบบ @npub/@nprofile โดยตรง
		// จะจับคู่:
		// 1. nostr:npub1..., nostr:nprofile1..., nostr:note1..., nostr:nevent1...
		// 2. @npub1..., @nprofile1...
		const nip21Regex =
			/(nostr:(npub1|nprofile1|note1|nevent1)[a-zA-Z0-9]+)|(@(npub1|nprofile1)[a-zA-Z0-9]+)/g;
		let match;

		while ((match = nip21Regex.exec(content)) !== null) {
			parts.push(content.substring(lastIndex, match.index));
			const matchedUri = match[0];
			// ส่ง URI ที่จับคู่ได้ทั้งหมดให้ NostrEntityText จัดการ
			parts.push(<NostrEntityText key={match.index} uri={matchedUri} />);
			lastIndex = nip21Regex.lastIndex;
		}
		parts.push(content.substring(lastIndex));

		return <>{parts}</>;
	}, [content]); // ndk ไม่ใช่ dependency โดยตรงแล้ว เพราะ NostrEntityText ดึงเอง

	return formattedContent;
}
