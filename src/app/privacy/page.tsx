export default function PrivacyPolicy() {
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
					when you use Beam.
				</p>

				<h2>1. Information We Collect</h2>
				<p>
					When you connect a streaming platform account to Beam, we collect only
					the information necessary to forward your live stream:
				</p>
				<ul>
					<li>
						<strong>OAuth access token</strong> – used solely to obtain your
						live-stream credentials from the connected platform on your behalf.
					</li>
					<li>
						<strong>Stream URL and stream key</strong> – the RTMP endpoint and
						key returned by the platform&rsquo;s API, used to forward your
						encoded video stream.
					</li>
				</ul>
				<p>
					We do not collect your profile information, followers, messages, or any
					other personal data from any connected platform.
				</p>

				<h2>2. How We Use Your Information</h2>
				<p>The information collected is used exclusively to:</p>
				<ul>
					<li>
						Authenticate with the connected platform&rsquo;s API on your behalf.
					</li>
					<li>
						Retrieve your live-stream URL and stream key so that Beam can forward
						your RTMP stream to the selected platform.
					</li>
					<li>
						Save encrypted stream credentials locally on your device so you do
						not need to reconnect each session.
					</li>
				</ul>
				<p>
					We do not sell, rent, or share your credentials or any data obtained
					through platform APIs with third parties.
				</p>

				<h2>3. Supported Platforms</h2>
				<p>
					Beam currently supports the following streaming platforms. Your use of
					Beam&rsquo;s integration with each platform is also subject to that
					platform&rsquo;s own privacy policy:
				</p>
				<ul>
					<li>
						<a
							href="https://www.tiktok.com/legal/privacy-policy"
							target="_blank"
							rel="noopener noreferrer"
						>
							TikTok Privacy Policy
						</a>
					</li>
					<li>
						<a
							href="https://policies.google.com/privacy"
							target="_blank"
							rel="noopener noreferrer"
						>
							YouTube / Google Privacy Policy
						</a>
					</li>
					<li>
						<a
							href="https://www.twitch.tv/p/legal/privacy-notice/"
							target="_blank"
							rel="noopener noreferrer"
						>
							Twitch Privacy Notice
						</a>
					</li>
					<li>
						<a
							href="https://www.facebook.com/policy.php"
							target="_blank"
							rel="noopener noreferrer"
						>
							Meta / Facebook Privacy Policy
						</a>
					</li>
				</ul>

				<h2>4. Data Storage and Security</h2>
				<p>
					Stream credentials (server URL and stream key) are stored encrypted on
					the Nostr decentralised network under your own cryptographic identity
					and are never transmitted to or stored on Beam servers. OAuth tokens
					are used in memory only and are not persisted beyond your browser
					session.
				</p>

				<h2>5. Data Retention</h2>
				<p>
					Because Beam does not maintain its own servers, no platform-derived
					data is retained by us. If you disconnect a platform account within
					Beam, your stream credentials for that platform are removed from local
					storage immediately.
				</p>

				<h2>6. Your Rights</h2>
				<p>
					You may disconnect any connected platform account from Beam at any time
					through the Multistream settings panel. This will remove the stored
					stream credentials for that platform from local storage.
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
