export default function TikTokPrivacyPolicy() {
	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<title>Privacy Policy – Beam Live Studio</title>
				<style
					dangerouslySetInnerHTML={{
						__html: `
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 24px; color: #333; line-height: 1.7; }
          h1 { font-size: 2rem; margin-bottom: 8px; }
          h2 { font-size: 1.25rem; margin-top: 32px; margin-bottom: 8px; }
          p { margin: 0 0 16px; }
          ul { margin: 0 0 16px; padding-left: 24px; }
          li { margin-bottom: 6px; }
          a { color: #0066cc; }
          .updated { color: #666; font-size: 0.9rem; margin-bottom: 32px; }
        `,
					}}
				/>
			</head>
			<body>
				<h1>Privacy Policy</h1>
				<p className="updated">Last updated: April 2025</p>

				<p>
					Beam Live Studio (&ldquo;Beam&rdquo;, &ldquo;we&rdquo;,
					&ldquo;our&rdquo;, or &ldquo;us&rdquo;) is a live-streaming
					application that lets you broadcast your stream to multiple platforms
					simultaneously, including TikTok, YouTube, Twitch, and Facebook. This
					Privacy Policy describes how we collect, use, and protect information
					when you use Beam&rsquo;s integration with the TikTok platform.
				</p>

				<h2>1. Information We Collect</h2>
				<p>
					When you connect your TikTok account to Beam, we collect only the
					information necessary to forward your live stream:
				</p>
				<ul>
					<li>
						<strong>TikTok OAuth access token</strong> – used solely to obtain
						your live-room stream credentials on your behalf.
					</li>
					<li>
						<strong>Stream URL and stream key</strong> – the RTMP endpoint and
						key returned by the TikTok API, used to forward your encoded video
						stream to TikTok Live.
					</li>
				</ul>
				<p>
					We do not collect your TikTok profile information, followers, messages,
					or any other personal data.
				</p>

				<h2>2. How We Use Your Information</h2>
				<p>The information collected is used exclusively to:</p>
				<ul>
					<li>Authenticate with the TikTok Open API on your behalf.</li>
					<li>
						Retrieve your live-room stream URL and stream key so that Beam can
						forward your RTMP stream to TikTok.
					</li>
					<li>Save encrypted stream credentials locally on your device so you do not need to reconnect each session.</li>
				</ul>
				<p>We do not sell, rent, or share your TikTok credentials or any data obtained through the TikTok API with third parties.</p>

				<h2>3. Data Storage and Security</h2>
				<p>
					Stream credentials (server URL and stream key) are stored encrypted on
					the Nostr decentralised network under your own cryptographic identity
					and are never transmitted to or stored on Beam servers. OAuth tokens
					are used in memory only and are not persisted beyond your browser
					session.
				</p>

				<h2>4. Data Retention</h2>
				<p>
					Because Beam does not maintain its own servers, no TikTok-derived data
					is retained by us. If you disconnect your TikTok account within Beam,
					your stream credentials are removed from local storage immediately.
				</p>

				<h2>5. Third-Party Services</h2>
				<p>
					Beam uses the TikTok Open API under TikTok&rsquo;s{" "}
					<a
						href="https://developers.tiktok.com/doc/tiktok-api-developer-term-of-service"
						target="_blank"
						rel="noopener noreferrer"
					>
						Developer Terms of Service
					</a>{" "}
					and{" "}
					<a
						href="https://www.tiktok.com/legal/privacy-policy"
						target="_blank"
						rel="noopener noreferrer"
					>
						TikTok Privacy Policy
					</a>
					. Your use of TikTok through Beam is also subject to those policies.
				</p>

				<h2>6. Your Rights</h2>
				<p>
					You may disconnect your TikTok account from Beam at any time through
					the Multistream settings panel. This will remove your stored stream
					credentials from local storage.
				</p>

				<h2>7. Children&rsquo;s Privacy</h2>
				<p>
					Beam is not intended for use by individuals under the age of 13. We do
					not knowingly collect personal information from children.
				</p>

				<h2>8. Changes to This Policy</h2>
				<p>
					We may update this Privacy Policy from time to time. The &ldquo;Last
					updated&rdquo; date at the top of this page reflects the most recent
					revision.
				</p>

				<h2>9. Contact</h2>
				<p>
					If you have any questions about this Privacy Policy, please open an
					issue in the{" "}
					<a
						href="https://github.com/nicky-dev/beam"
						target="_blank"
						rel="noopener noreferrer"
					>
						Beam GitHub repository
					</a>
					.
				</p>
			</body>
		</html>
	);
}
