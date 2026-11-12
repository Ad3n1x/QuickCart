# QuickCart NDPA implementation register

**Working branch:** `compliance/ndpa-privacy-foundation`  
**Reference framework:** Nigeria Data Protection Act 2023 and the NDPC's current implementation guidance, including GAID 2025 where applicable.  
**Status:** Engineering foundation in progress. This document is not a legal opinion, audit certificate, or claim of regulatory compliance.

## Implemented in this branch

- Public Privacy Centre at `/privacy`, linked from the landing-page footer.
- Plain-language draft notice covering the main data categories visible in the current application: account/contact details, seller/store details, product and order data, delivery details, payment references/status, support requests, and technical/security logs.
- Disclosure of the configured service-provider categories observed in the repository: MongoDB, Vercel, Render, Brevo, and ALATPay. Actual contracting entities, processing locations, onward transfers, and safeguards still require confirmation from account and contract records.
- Public data-subject request intake at `POST /api/privacy/requests`.
- Input validation, bounded request text, keyed HMAC pseudonyms for email/IP rate limiting (using `PRIVACY_HASH_SECRET`, with server-secret fallbacks), and a limit of three requests per email or IP in a rolling 24-hour window.
- MongoDB indexes for privacy-request date sorting and the two rate-limit lookup paths; no automatic TTL deletion is configured because the retention schedule is not yet approved.
- Completion safeguards: an administrator cannot mark a request completed until identity is verified and completion evidence is recorded; declined requests require a documented reason.
- Private admin request review at `/admin/privacy`, protected by the existing dedicated admin authentication middleware.
- Admin workflow fields for request status, identity-verification status, internal notes, and an append-only action history.
- Tests for valid intake, invalid submissions, rate limiting, and the admin review/update workflow.
- Project syntax and invariant checks include the new privacy route and UI.

## Important safeguards and limits

- A submitted request is not proof of identity. Admins must verify identity proportionately before disclosing, correcting, exporting, restricting, or deleting personal data.
- Do not request passwords, full payment credentials, or identity-document numbers in the public form.
- The admin workflow records and tracks requests; it does not yet automatically execute account export, correction, deletion, restriction, or portability across all MongoDB collections. These must be handled through a documented, verified manual process until collection-aware workflows are designed and tested.
- A request must not be marked completed until the actual action, legal exception (if any), response, and completion evidence have been recorded.
- Do not add a TTL index to privacy-request records until the operator approves a documented retention schedule.
- The public notice is intentionally marked as a draft. The operator confirmed that AD3N1X is only the public brand, the platform is currently operated by an unregistered individual, there is no business address, the privacy mailbox ad3n1x271@gmail.com can receive requests, and no DPO has been appointed. The individual's legal name and an appropriate service/contact address have not been supplied. The operator's initial preference is to retain account data while the account remains active and accept deletion requests; this is not yet a complete or approved retention schedule because post-deletion legal, accounting, security, backup, and dispute-retention periods still need to be mapped. Vendor processing locations and international-transfer facts remain unconfirmed.
- No NDPC registration, audit return, DPIA, DPO appointment, or regulatory certification is claimed by this code change.

## Required operator and legal decisions before public launch

1. Operator confirmed AD3N1X is a public brand, not a registered business; the platform is currently operated by an unregistered individual. The privacy mailbox ad3n1x271@gmail.com is confirmed as usable. Before final publication, establish the individual's legal controller identity and an appropriate service/contact address; do not publish a private home address without considering safer lawful contact arrangements.
2. Determine and document QuickCart's controller/processor roles for each processing activity, including seller-managed customer records.
3. Complete a data inventory and lawful-basis assessment for every field and purpose.
4. Confirm whether a DPO is required and appoint/designate one where applicable.
5. Assess NDPC registration and Compliance Audit Return obligations, including whether any major-importance criteria apply.
6. Complete a DPIA where the processing is likely to result in high risk.
7. Review and execute appropriate processor agreements with hosting, database, email, payment, analytics, support, and other vendors; confirm transfer locations and safeguards.
8. Operator's initial preference is to retain account data while an account is active and allow deletion requests. Convert this into an approved record-by-record retention/deletion schedule covering post-deletion account data, orders, payment records, support records, logs, backups, and privacy requests, including justified legal/accounting/security exceptions.
9. Inventory all cookies, local/session storage, SDKs, analytics and marketing tags. Keep optional tracking disabled until valid consent is collected where required.
10. Approve an identity-verification and response procedure for rights requests, including exceptions and response tracking.
11. Implement and test actual data export, correction, erasure, restriction, objection and consent-withdrawal workflows, with legal holds and accounting obligations handled explicitly.
12. Complete a security review covering browser token storage, XSS protections/CSP, access control, tenant isolation, encryption, backup access, secrets, logging, payment callback authenticity, and incident response.
13. Prepare a breach-response playbook with decision owners, evidence preservation, affected-person communications, and regulator notification steps in accordance with applicable statutory deadlines.
14. Obtain review by a qualified Nigerian data-protection professional before representing the platform as compliant.

## Required deployment configuration

- Set a high-entropy `PRIVACY_HASH_SECRET` in the production API environment. The route can fall back to `JWT_SECRET` or `ADMIN_JWT_SECRET`, but a dedicated secret is preferred. Rotating the key resets rate-limit pseudonym matching for earlier requests.
- Set the frontend build variables `VITE_LEGAL_OPERATOR_NAME` and `VITE_PRIVACY_CONTACT_EMAIL` to the verified legal controller/operator identity and monitored privacy mailbox. Do not populate these with an individual's details unless the operator has formally designated that contact.
- Keep the public privacy notice marked as a draft until the operator identity, monitored privacy contact, retention periods, lawful-basis map, processor details, and transfer facts are verified and published.
- Confirm MongoDB can create the new `privacy_requests` indexes during startup; inspect logs for index-creation errors after deployment.

## Engineering follow-up

- Build a field-level data map and retention job only after the operator approves retention periods.
- Add authenticated export and account-correction flows, then controlled deletion/anonymisation with legal-hold checks.
- Add privacy-request email acknowledgement and response notifications after the official privacy mailbox and sender identity are configured.
- Add consent records and a preference manager only after the cookie/SDK inventory establishes which optional technologies actually run.
- Run unit, build, browser, security, tenant-isolation, backup-restore, and production smoke tests before merging to `main`.
