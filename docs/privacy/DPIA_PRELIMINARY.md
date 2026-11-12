# QuickCart — Preliminary Data Privacy Impact Assessment

**Status: PRELIMINARY ONLY — NOT APPROVED, NOT SIGNED, NOT FILED.**  
**Required next step:** QuickCart is an e-commerce service and its known architecture includes cross-border processing/storage. GAID 2025 Article 28 expressly lists e-commerce services and cross-border data transfer as mandatory DPIA circumstances. The assessment must be completed in the NDPC Schedule 4 format, vetted and signed by a certified DPO accredited by NDPC, and submitted as required. This draft does not satisfy that obligation.

## Processing overview

QuickCart is a web marketplace/storefront service used by sellers and buyers in Nigeria. Repository-visible processing includes account registration/authentication, seller stores/catalogues, buyer checkout, orders, delivery, payment status/reference handling, transactional email, customer support, privacy requests and technical/security logs.

## Known hosting and processing locations (checked 2026-11-12)

- **Vercel frontend:** Connected project `quick-cart`, Vite. Static assets are served through Vercel's global CDN. Vercel's current DPA states its primary processing facilities are in the United States, that Customer Data may be processed in the US and wherever Vercel/subprocessors operate, and that backups are globally replicated. Its public DPA applies to Pro and Enterprise plans; QuickCart's account plan was not established by connected project metadata. No project-specific Function region was verified.
- **Render API:** Connected `quickcart-api` Node web service in Frankfurt, Germany, Free plan, one instance. Render Services, Inc. is the provider. Its public Terms state that personal information may be transferred to and processed in the US; therefore the Frankfurt service region does not establish Germany-only processing.
- **MongoDB Atlas:** Connected `Cluster0` on AWS `US_WEST_2` (Oregon, USA), FREE tier, MongoDB 8.0.37. MongoDB's public DPA is incorporated into its Cloud Terms; AWS is listed as an Atlas cloud subprocessor. The account invoice must confirm the contracting MongoDB entity.
- **Brevo:** Public provider documentation states database hosting in the EU using OVH in France/Germany and Google Cloud in Belgium, with multi-location replication and encrypted backups. QuickCart's invoice entity, account-specific subprocessor list and exact message-delivery/support locations are unknown.
- **ALATPay:** Public Privacy Policy refers to ALATPay and Wema Group; the July 2026 Merchant Terms include a restriction on overseas transmission/processing/storage of the other party's personal data without prior written data-subject consent. Exact QuickCart contract, API fields, processing location and onward recipients remain unknown.
- **Couriers:** Seller-selected delivery providers may receive buyer names, phone numbers, addresses and order instructions. No standard provider or country is known.

Known jurisdictions include Germany, the United States, France and Belgium, plus Vercel's global infrastructure and any further vendor/courier locations. The known data path includes browser-to-Render API traffic in Germany and Render-to-MongoDB traffic to AWS US West. Vercel global infrastructure and vendor support/telemetry may create additional transfers.

## Nigerian transfer-law implications

NDPA sections 41–43 and GAID 2025 Article 45 / Schedule 5 require a documented lawful transfer route. Assess the NDPC adequacy position, any NDPC-approved Cross-Border Data Transfer Instrument, or a specific permitted statutory basis for each transfer. A vendor's GDPR SCCs, public DPA, or generic consent statement does not automatically establish an NDPC-approved Nigerian transfer route. The ALATPay Merchant Terms clause 36.5 may add a contractual restriction and must be reconciled with the architecture and the executed agreement. Do not launch a final notice claiming transfer compliance before this review.

## Necessity and proportionality

For every field, document the function requiring it, whether mandatory, whether less/pseudonymised data would work, who can access it, why and for how long, whether another record already serves the purpose, and whether it exposes data about another person. Do not collect full card credentials or identity-document numbers through privacy forms. Payment data should remain with the payment provider unless a verified integration requirement establishes otherwise.

## Data subjects and vulnerability

Potential data subjects include buyers, sellers, seller employees/agents, delivery contacts and people mentioned in support requests. Children may access public storefronts or the marketplace. GAID Schedule 6 explicitly identifies being a minor as a vulnerability factor. A professionally reviewed age/child-data design is required: determine whether children are targeted or likely to use the service, minimise age data, apply section 31 and Child's Rights Act safeguards, obtain parental/guardian consent where required, and provide age-appropriate information. A checkbox alone does not establish valid parental consent.

## Principal risks and proposed mitigations

| Risk | Potential impact | Proposed mitigation | Evidence required |
|---|---|---|---|
| Account takeover/credential exposure | Unauthorised access | Strong password hashing, admin session revocation, MFA assessment, rate limits, secret rotation | Security test/configuration |
| Cross-tenant data leakage | Seller sees another seller's data | Store-scoped queries, ownership checks, negative tenant-isolation tests | Automated test suite |
| Over-retention | Unnecessary exposure | Record-level schedule, deletion/anonymisation jobs, backup expiry/restore controls | Approved schedule and deletion test |
| Excessive seller visibility | Buyer data exposed beyond fulfilment | Field minimisation, least-privilege views, access logging | Role/access matrix |
| Vendor/transfer uncertainty | Loss of control or unlawful transfer | Vendor due diligence, DPAs, transfer assessment and region evidence | Completed vendor register and signed assessment |
| Child data without safeguards | Harm to vulnerable users | Age-appropriate UX, parental consent where required, minimisation, no profiling/marketing to children | Legal/DPO-approved assessment |
| Rights requests incomplete | Requests unresolved across systems | Identity checks, export/correction/deletion runbooks, vendor coordination | End-to-end DSAR test |
| Slow incident escalation | Harm and missed deadline | 72-hour playbook, incident contact and tabletop | Exercise report |
| Automated decisions/profiling | Unfair significant effects | Inventory decision logic; human review/challenge for significant decisions | Rules/model inventory |
| Overseas processing and access | Data processed/accessed outside Nigeria without an appropriate documented route | Country-by-country data map, adequacy/transfer-basis assessment, DPA and subprocessor review, access controls and minimisation | NDPC/DPCO-reviewed transfer assessment |
| ALATPay contractual conflict | Merchant contract may restrict offshore processing/storage | Obtain executed merchant agreement; reconcile clause 36.5 and data-subject consent wording with NDPA transfer rules and current architecture | Written ALATPay clarification and Nigerian legal review |

## Existing code observations

- Separate seller, customer and administrator authentication paths.
- Password hashes rather than plaintext passwords.
- Store ownership checks in seller routes and an admin-only privacy-request workflow.
- Production API HTTPS enforcement and security response headers.
- Privacy request validation, rate limiting and completion safeguards.

These are repository observations only. They do not prove production configuration, vendor controls or every route is secure.

## Required before approval

1. Complete field-level ROPA, role allocation, lawful-basis and legitimate-interest assessments.
2. Verify provider invoices, account plans, DPAs, subprocessors, support access, backups, logs and retention.
3. Complete NDPA section 41–43 / GAID Schedule 5 transfer assessments for every cross-border flow and resolve the ALATPay contract issue.
4. Approve record-specific retention/deletion and test backup restoration with deletion replay.
5. Complete child-data/age-assurance assessment.
6. Perform security, access-control, tenant-isolation and end-to-end rights-request testing.
7. Evaluate residual risk and mitigation owners.
8. Obtain vetting/signature by a certified DPO accredited by NDPC, use Schedule 4, and submit/file as required before relying on the DPIA.
9. Record conditions, owners, review date and change triggers.

## Approval record

| Role | Evidence | Decision |
|---|---|---|
| Controller/operator | Pending private governance arrangement | Not approved |
| Accredited DPO | Not appointed | Not reviewed or signed |
| Nigerian privacy counsel/DPCO | Not engaged | Not reviewed |
| Cross-border transfer assessment | Public provider documents and account-region metadata gathered; legal route not assessed/approved | Not approved |
