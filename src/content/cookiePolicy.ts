// Canonical Cookie Policy v1.0 — embedded as static content.
// Do not modify the body without legal review.

export const COOKIE_POLICY_MD = String.raw`# DiRxctional Cookie Policy

*Last Updated: April 30, 2026*
*Version: 1.0 — DRAFT — NOT LEGALLY REVIEWED*

> **⚠️ ATTORNEY REVIEW REQUIRED before publishing.** This Cookie Policy is intentionally short because DiRxctional uses only essential authentication and session cookies — no advertising, no third-party analytics, no behavioral tracking. Your lawyer should confirm scope before publish.

---

## 1. About This Policy

This Cookie Policy explains what cookies and similar technologies **ScRXpt, LLC** (operating the **DiRxctional** platform) uses on \`dirxctional.com\` and \`app.dirxctional.com\` (the "Services"), and how you can control them.

This policy is part of, and should be read together with, our [Privacy Policy](/privacy).

---

## 2. What Are Cookies?

Cookies are small text files placed on your device by a website you visit. They allow the website to remember your actions and preferences (such as login state, language, and other display preferences) over a period of time, so you don't have to keep re-entering them whenever you come back to the site or browse from one page to another.

We may also use other similar technologies such as **localStorage** and **sessionStorage**, which serve a similar purpose to cookies but store data inside your browser rather than as a separate file. For simplicity, this policy uses "cookies" to refer to all such technologies.

---

## 3. Cookies We Use

DiRxctional uses **only essential first-party cookies**. We do not use advertising cookies, third-party analytics cookies, social media tracking pixels, or behavioral profiling technologies of any kind.

| Cookie | Purpose | Set by | Type | Lifetime |
|---|---|---|---|---|
| Authentication token | Keeps you signed in across pages and requests | Amazon Cognito (our identity provider) | First-party, essential | Up to 8 hours; cleared on sign-out |
| Session identifier | Short-lived browser session ID for request continuity | DiRxctional platform | First-party, essential, session | Cleared when browser closes |
| CSRF token | Protects against cross-site request forgery | DiRxctional platform | First-party, essential, session | Cleared when browser closes |
| Cookie consent state (marketing site only) | Records that you have viewed the Cookie Policy notice | DiRxctional marketing site | First-party, essential | Up to 12 months |

**We do not use:**
- Google Analytics, Adobe Analytics, Mixpanel, Heap, Segment, or other third-party analytics
- Facebook Pixel, LinkedIn Insight Tag, TikTok Pixel, or other advertising trackers
- Hotjar, FullStory, LogRocket, or other session-replay tools
- Cross-site behavioral advertising cookies
- Social media share-and-track buttons that set third-party cookies

---

## 4. Why We Use Cookies

The cookies we set are required for the platform to function:
- **Without the authentication cookie**, you would be signed out after every page navigation.
- **Without the session identifier**, security features like CSRF protection cannot work.
- **Without the cookie consent state**, you would be re-shown the cookie notice on every page visit.

These cookies do **not** track you across other websites, build a profile of your interests, or share information with third parties for marketing purposes.

---

## 5. Your Choices

### Browser Controls

Most web browsers allow you to control cookies through their settings:
- **Chrome:** Settings → Privacy and security → Cookies and other site data
- **Safari:** Settings → Privacy → Manage Website Data
- **Firefox:** Settings → Privacy & Security → Cookies and Site Data
- **Edge:** Settings → Cookies and site permissions → Cookies and site data

If you disable or block essential cookies, **the DiRxctional platform may not function** — specifically, you will not be able to remain signed in or perform any authenticated action.

### Do Not Track (DNT)

Some browsers offer a "Do Not Track" (DNT) signal. **We do not currently respond to DNT signals** because there is no consensus standard for honoring them. Because we do not perform tracking in the first place, this has no practical effect on you.

### "Sale" or "Sharing" of Personal Information

We do not "sell" or "share" personal information for cross-context behavioral advertising as those terms are defined under California's CCPA/CPRA, Virginia's VCDPA, or other US state privacy laws. There is no opt-out to provide because the practice does not occur.

---

## 6. Changes to This Policy

We may update this Cookie Policy from time to time, particularly when we add, remove, or change a cookie. The "Last Updated" date at the top of this policy will reflect any change. Material changes will be communicated via prominent notice on our Services.

---

## 7. Contact Us

**Privacy inquiries:** privacy@dirxctional.com
**Mailing address:** ScRXpt, LLC · Attn: Data Protection Officer · 2320 N. Houston Street, #2001 · Dallas, Texas 75219

For more about how we handle personal information generally, see our [Privacy Policy](/privacy).

---

*This Cookie Policy is © 2026 ScRXpt, LLC. It is current as of April 30, 2026 (v1.0). This draft has not yet been reviewed by licensed legal counsel and should not be published as-is without that review.*
`;
