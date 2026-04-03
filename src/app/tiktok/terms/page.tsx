export default function TikTokTermsOfService() {
	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<title>Terms of Service – Beam Live Studio</title>
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
				<h1>Terms of Service</h1>
				<p className="updated">Last updated: April 2025</p>

				<p>
					These Terms of Service (&ldquo;Terms&rdquo;) govern your use of Beam
					Live Studio (&ldquo;Beam&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;,
					or &ldquo;us&rdquo;), an open-source live-streaming application. By
					using Beam, you agree to these Terms.
				</p>

				<h2>1. Description of Service</h2>
				<p>
					Beam is a browser-based live-streaming studio that allows you to
					broadcast your stream to multiple platforms simultaneously, including
					TikTok, YouTube, Twitch, and Facebook. Beam acts as a relay between
					your streaming source (e.g. OBS) and the destination platforms via
					their respective RTMP endpoints.
				</p>

				<h2>2. TikTok Integration</h2>
				<p>
					Beam integrates with the TikTok Open API to allow you to stream
					directly to TikTok Live. By connecting your TikTok account to Beam,
					you authorise Beam to:
				</p>
				<ul>
					<li>Obtain a short-lived OAuth access token on your behalf.</li>
					<li>
						Call the TikTok Live API to create a live room and retrieve your
						stream URL and stream key.
					</li>
					<li>
						Forward your encoded video stream to the TikTok RTMP ingest
						endpoint.
					</li>
				</ul>
				<p>
					Your use of the TikTok integration is also subject to{" "}
					<a
						href="https://developers.tiktok.com/doc/tiktok-api-developer-term-of-service"
						target="_blank"
						rel="noopener noreferrer"
					>
						TikTok&rsquo;s Developer Terms of Service
					</a>{" "}
					and{" "}
					<a
						href="https://www.tiktok.com/legal/terms-of-service"
						target="_blank"
						rel="noopener noreferrer"
					>
						TikTok&rsquo;s Terms of Service
					</a>
					.
				</p>

				<h2>3. User Responsibilities</h2>
				<p>You agree that you will:</p>
				<ul>
					<li>
						Comply with the terms and community guidelines of all platforms you
						stream to through Beam, including TikTok, YouTube, Twitch, and
						Facebook.
					</li>
					<li>
						Not use Beam to stream content that is illegal, harmful, threatening,
						abusive, defamatory, or otherwise objectionable.
					</li>
					<li>
						Not use Beam to violate any third-party intellectual property rights.
					</li>
					<li>
						Keep your stream keys and credentials confidential and not share them
						with unauthorised parties.
					</li>
				</ul>

				<h2>4. Intellectual Property</h2>
				<p>
					Beam is open-source software licensed under the MIT License. You are
					free to use, copy, modify, merge, publish, distribute, sublicense,
					and/or sell copies of the software, subject to the terms of that
					license. You retain all rights to the content you stream through Beam.
				</p>

				<h2>5. Disclaimer of Warranties</h2>
				<p>
					Beam is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;
					without warranty of any kind, express or implied, including but not
					limited to warranties of merchantability, fitness for a particular
					purpose, or non-infringement. We do not guarantee that the service will
					be uninterrupted, error-free, or that defects will be corrected.
				</p>

				<h2>6. Limitation of Liability</h2>
				<p>
					To the fullest extent permitted by applicable law, Beam and its
					contributors shall not be liable for any indirect, incidental, special,
					consequential, or punitive damages arising out of your use of or
					inability to use the service.
				</p>

				<h2>7. Changes to These Terms</h2>
				<p>
					We may update these Terms from time to time. The &ldquo;Last
					updated&rdquo; date at the top of this page reflects the most recent
					revision. Continued use of Beam after changes constitutes acceptance of
					the updated Terms.
				</p>

				<h2>8. Contact</h2>
				<p>
					For questions about these Terms, please open an issue in the{" "}
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
