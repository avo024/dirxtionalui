// Canonical Privacy Policy v1.1a — embedded as static content.
// Do not modify the body without legal review.

export const PRIVACY_POLICY_MD = String.raw`# DiRxctional Privacy Policy

*Last Updated: April 30, 2026*
*Version: 1.1*

---

## 1. About This Policy

This Privacy Policy explains how **ScRXpt, LLC**, a Texas limited liability company that operates the **DiRxctional** platform (collectively, "ScRXpt," "DiRxctional," "we," "us," or "our"), handles information we receive when you use our website (\`dirxctional.com\`), our platform (\`app.dirxctional.com\`), and related services (collectively, the "Services").

**We are a HIPAA Business Associate.** We create, receive, maintain, and transmit Protected Health Information ("PHI") on behalf of healthcare clinics (our "Covered Entity customers"). When we handle PHI, our obligations are governed primarily by our Business Associate Agreement ("BAA") with each clinic and by HIPAA itself (45 C.F.R. Parts 160 and 164). This Privacy Policy covers **information we collect directly**, such as website visitors and platform users; it does not modify the BAA. Patient rights with respect to PHI are exercised through the patient's healthcare provider (the Covered Entity).

**Privacy contact:** privacy@dirxctional.com
**Principal place of business:** 2320 N. Houston Street, #2001, Dallas, Texas 75219
**Data location:** All personal information is processed and stored in the United States, primarily in Amazon Web Services data centers in the us-east-2 (Ohio) region.

---

## 2. Information We Collect

### 2.1 Information You Provide

When you use our Services, you may provide:
- **Account information:** name, email address, phone number, professional role, clinic affiliation, National Provider Identifier (NPI), and professional credentials.
- **Authentication information:** username and password (passwords are stored only as one-way salted hashes by our identity provider, Amazon Cognito).
- **Communications:** messages sent to us via support, email, or in-app notes.
- **Uploaded documents:** enrollment forms, insurance cards, chart notes, prescriptions, and other referral-related documents you submit on behalf of your clinic's patients. These may contain PHI.

### 2.2 Protected Health Information (PHI)

In the course of providing the Services, we receive PHI that your clinic's patients have consented to share with their healthcare providers. We handle PHI solely as permitted by the BAA with the applicable clinic and by HIPAA. **We never use PHI for marketing, sell PHI, or disclose PHI except as expressly permitted by the BAA or required by law.**

### 2.3 Information Collected Automatically

We collect limited technical data when you use our website or platform, including:
- IP address
- Device and browser type
- Pages viewed and actions taken within the platform (for audit logging and security)
- Timestamps

### 2.4 Cookies and Similar Technologies

We use only essential first-party session cookies required for authentication and login persistence. We do **not** use third-party advertising cookies, marketing trackers, behavioral analytics, or cross-site tracking technologies. See Section 7 for cookie controls.

### 2.5 Payment Information

If your organization purchases a paid subscription, we collect billing contact information (name, email, mailing address) and transaction metadata (invoice amount, date, status, last four digits of payment method). **Full payment card numbers, CVV codes, and bank account numbers are processed and stored exclusively by our payment processor, Stripe, Inc., on Stripe-hosted payment pages.** We do not store these on our systems. Stripe's processing is governed by its Privacy Policy at https://stripe.com/privacy.

---

## 3. How We Use Information

We use information only for:
- **Providing the Services** — processing referrals, running AI document extraction, generating referral PDFs, delivering referrals to specialty pharmacies, managing prior authorization workflows.
- **Platform operation** — authentication, multi-factor authentication, role-based access control, audit logging, security monitoring, fraud prevention.
- **Communication** — sending transactional emails (invites, referral status updates, approvals, rejections), and responding to support requests.
- **Legal compliance** — meeting HIPAA, Texas HB 300, and other legal obligations, including maintaining audit records for the periods required by law.
- **Product improvement** — using **de-identified or aggregate** data only, in accordance with 45 C.F.R. § 164.514(a)–(c). Where permitted by the applicable BAA and HIPAA's "healthcare operations" provision (45 C.F.R. § 164.501), we may use de-identified or aggregate signals derived from clinic activity (such as which extracted-data fields are most frequently corrected by clinical staff) to improve the accuracy of our AI extraction. No identifiable patient information is shared, sold, or used for marketing.

**We do not sell personal information, and we do not use PHI for any secondary purposes.**

---

## 4. Subprocessors Who May Access PHI or Personal Information

To deliver the Services, we work with vetted third-party providers who are themselves HIPAA Business Associates of ours and have signed Business Associate Agreements where required. Our current subprocessors are:

| Vendor | Purpose | BAA / Coverage |
|--------|---------|----------------|
| **Amazon Web Services (AWS) — EC2, RDS, S3, EBS** | Cloud infrastructure, database, object storage | Executed AWS BAA |
| **Amazon Web Services (AWS) — Textract, Bedrock** | OCR and AI extraction of referral documents | Executed AWS BAA |
| **Amazon Web Services (AWS) — Simple Email Service (SES)** | Transactional email delivery (invites, referral notifications) | Executed AWS BAA |
| **Amazon Web Services (AWS) — CloudFront, AWS WAF, AWS Shield Standard** | Content delivery, web application firewall, DDoS protection at the edge | Executed AWS BAA |
| **Amazon Web Services (AWS) — Cognito** | User authentication, session management, multi-factor authentication | Executed AWS BAA |
| **Cloudflare, Inc.** | DNS records only for the marketing website \`dirxctional.com\`. Cloudflare does not proxy, decrypt, or process PHI. | No BAA required under current configuration. The PHI-handling platform \`app.dirxctional.com\` does not pass through Cloudflare. |
| **Stripe, Inc.** | Subscription billing and payment processing on Stripe-hosted pages | Stripe DPA. Stripe does not receive PHI. |
| **Termly LLC** | Privacy Policy / Cookie Policy / Terms of Service templating and version tracking | No PHI involved. |

We will update this list when subprocessors are added, removed, or changed, and we will notify our Covered Entity customers per our BAA obligations.

---

## 5. How We Share Information

We share information only:
- **With your clinic** — referrals and related documents belong to the clinic; we return and display them within the platform as authorized.
- **With specialty pharmacies** — as directed by your clinic when a referral is sent.
- **With subprocessors** — listed in Section 4.
- **As required by law** — in response to a valid subpoena, court order, or government request, with notice to the affected clinic where permitted.
- **In a business transfer** — if DiRxctional is acquired or merges, successor entities inherit the same privacy obligations.

**We do not share information for marketing or advertising.**

---

## 6. Your Rights

### 6.1 HIPAA Rights (for patients)

If you are a patient whose PHI is processed by us on behalf of your healthcare provider, HIPAA grants you the following rights, exercisable **through your healthcare provider** (the Covered Entity):
- Right to access your PHI
- Right to request amendment of your PHI
- Right to an accounting of disclosures
- Right to request restrictions on uses and disclosures

We will support your provider in responding to these requests within the timeframes required by HIPAA.

### 6.2 Texas Rights — HB 300 and TDPSA

If you are a Texas resident, you have rights under two state laws in addition to your HIPAA rights:

**Texas Medical Records Privacy Act (Texas Health & Safety Code §§ 181.001 et seq., "Texas HB 300"):**

- **Right to expedited access**: If you request access to your electronic PHI stored in an EHR system, we will facilitate access through your healthcare provider within **fifteen (15) business days** (compared to the 30-day federal HIPAA timeline).
- **Right to per-disclosure authorization**: Electronic disclosures of your PHI beyond treatment, payment, and healthcare operations require your specific written authorization, unique to the purpose and recipient.
- **Notice of restricted electronic disclosures**: We will only disclose your electronic PHI for treatment, payment, healthcare operations, or specific insurance/HMO operations without your authorization.
- **Right to receive training attestations**: Upon request, we will attest that our workforce has completed HIPAA and Texas-specific training.

**Texas Data Privacy and Security Act ("TDPSA," effective July 1, 2025):** As a Texas resident, you may also have rights under the TDPSA to access, correct, delete, or obtain a portable copy of personal information we hold about you, as well as the right to opt out of "sale" or targeted advertising. To exercise these rights, contact \`privacy@dirxctional.com\`. Note that TDPSA does not generally apply to PHI we process under a BAA — those rights are exercised under HIPAA via your healthcare provider per § 6.1 above.

### 6.3 Other US State Privacy Rights

If you reside in another US state with a comprehensive consumer privacy law (such as California's CCPA/CPRA, Virginia's VCDPA, Colorado's CPA, Connecticut's CTDPA, Utah's UCPA, the privacy laws of Arkansas, Delaware, Florida, Indiana, Iowa, Kentucky, Maryland, Minnesota, Montana, Nebraska, New Hampshire, New Jersey, Oklahoma, Oregon, Rhode Island, or Tennessee), you may have rights to access, correct, delete, or obtain a copy of the personal information we hold about you, as well as the right to opt out of "sale" or "sharing" of personal information for targeted advertising.

**We do not sell personal information and do not engage in targeted advertising.** To exercise other rights under your state's privacy law, contact us at \`privacy@dirxctional.com\`. We will verify your identity and respond within the timeframes required by applicable law.

### 6.4 Platform User Rights

If you are a clinic user of our platform and want to update or delete the non-PHI information in your account (name, email, etc.), contact us at \`privacy@dirxctional.com\`.

---

## 7. Cookies and Tracking

We use only essential first-party cookies required for authentication and session management. We do not use third-party advertising cookies, third-party analytics cookies, or behavioral tracking technologies. Specifically:

- **Authentication cookie** — issued by our identity provider (Amazon Cognito) when you sign in; required for the platform to recognize you across requests; cleared on sign-out.
- **Session cookie** — short-lived browser session identifier; cleared when the browser is closed.

You can disable cookies in your browser settings, but the platform may not function correctly without them. **We do not currently respond to "Do Not Track" (DNT) browser signals** because there is no consensus standard for honoring them.

---

## 8. Data Retention

We retain:
- **PHI** — for the period specified in the BAA with each clinic, and we return or destroy PHI upon BAA termination per 45 C.F.R. § 164.504(e)(2)(ii)(J).
- **Audit logs** — for at least six (6) years, as required by 45 C.F.R. § 164.316(b)(2)(i). Audit logs are also exported daily to tamper-evident storage (Amazon S3 with Object Lock in COMPLIANCE mode) so they cannot be modified or deleted before the retention period expires.
- **Account data** — while your account is active and for up to ninety (90) days after closure, then deleted.
- **Billing records** — for up to seven (7) years for tax and accounting purposes.

---

## 9. Security

We apply administrative, physical, and technical safeguards per the HIPAA Security Rule (45 C.F.R. Part 164 Subpart C). Current safeguards include:

- **TLS 1.3** encryption in transit at the edge; TLS 1.2 minimum from edge to origin servers; HSTS enforced.
- **AES-256** encryption at rest (AWS-managed KMS keys, Amazon S3 server-side encryption, Amazon RDS encryption, EBS volume encryption).
- **Role-based access control** with least-privilege principles, scoped per clinic.
- **Multi-factor authentication (MFA)** required for all internal administrators and clinic users (TOTP via authenticator app).
- **Audit logging** of all PHI access, daily exported to tamper-evident storage.
- **Web Application Firewall** (AWS WAF) with rate limiting, SQL injection protection, and Layer 7 DDoS rules.
- **Origin lockdown** — the platform's origin servers are reachable only from Amazon CloudFront edge IPs; direct public internet access to origin is blocked.
- **Encrypted database connections** (\`rds.force_ssl=1\` enforced server-side; client-side \`sslmode=require\`).
- **Workforce training** on PHI handling and a signed Workforce Confidentiality & HIPAA Acknowledgment for every workforce member at hire.
- **Quarterly disaster-recovery testing** (database restore from backup) and 6-year tamper-evident audit log retention.

No electronic system is perfectly secure; we will notify Covered Entity clinics of any security breach involving PHI per Section 10.

**Forthcoming HIPAA Security Rule update.** The U.S. Department of Health and Human Services published a Notice of Proposed Rulemaking on January 6, 2025 ("HIPAA Security Rule To Strengthen the Cybersecurity of Electronic Protected Health Information") proposing mandatory MFA, mandatory encryption at rest and in transit, annual risk assessments, semiannual vulnerability scans, annual penetration testing, network segmentation, and tightened business-associate oversight. We monitor this proceeding and will update our safeguards and this Privacy Policy as the final rule takes effect.

---

## 10. Breach Notification

In the unlikely event of a breach of unsecured PHI, we will notify the applicable Covered Entity clinic **without unreasonable delay and in no case later than fifteen (15) calendar days** after discovery, as committed in our BAA. The clinic is responsible for notifying affected patients per 45 C.F.R. § 164.404 (within 60 days of discovery). Our internal Incident Response Plan (available upon request to clinic customers) governs investigation, mitigation, and reporting steps.

---

## 11. Children's Privacy

Our Services are not directed at children under 13, and we do not knowingly collect data from children under 13 except as part of PHI received from a healthcare provider with parental consent and subject to HIPAA.

---

## 12. International Users

Our Services are operated from the United States. If you access our Services from outside the U.S., your data will be transferred to and processed in the United States. **We do not currently serve or process data from the European Economic Area, the United Kingdom, or other jurisdictions with cross-border data transfer restrictions.**

---

## 13. Changes to This Policy

We may update this Privacy Policy from time to time. When we do, we will update the "Last Updated" date at the top. Material changes that affect PHI handling will be communicated to Covered Entity clinics per our BAA. Material changes that affect non-PHI personal information will be communicated by prominent notice on our Services or by email at least thirty (30) days before they take effect, where practicable. Your continued use of the Services after a change constitutes acceptance of the updated Privacy Policy.

---

## 14. Contact Us

**Privacy inquiries:** privacy@dirxctional.com
**Mailing address:** ScRXpt, LLC · Attn: Data Protection Officer · 2320 N. Houston Street, #2001 · Dallas, Texas 75219
**General support:** support@dirxctional.com
**Security incidents:** security@dirxctional.com

---

*This Privacy Policy is © 2026 ScRXpt, LLC. It is current as of April 30, 2026 (v1.1).*
`;
