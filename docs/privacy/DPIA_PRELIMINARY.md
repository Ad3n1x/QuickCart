# QuickCart — Preliminary Data Privacy Impact Assessment

**Status: PRELIMINARY ONLY — NOT APPROVED, NOT SIGNED, NOT FILED.**  
**Required next step:** A qualified, currently accredited/certified DPO must complete/vet the DPIA and determine filing requirements. GAID 2025 Article 28 expressly lists e-commerce services among circumstances requiring a DPIA. This draft does not satisfy that obligation.

## Processing overview

QuickCart is a web marketplace/storefront service used by sellers and buyers in Nigeria. Repository-visible processing includes account registration/authentication, seller stores/catalogues, buyer checkout, orders, delivery, payment status/reference handling, transactional email, customer support, privacy requests and technical/security logs. Production volumes, regions, subprocessors and exact fields remain to be verified.

## Necessity and proportionality

For every field, document the function requiring it, whether mandatory, whether less/pseudonymised data would work, who can access it, why and for how long, whether another record already serves the purpose, and whether it exposes data about another person. Do not collect full card credentials or identity-document numbers through privacy forms. Payment data should remain with the payment provider unless a verified integration requirement establishes otherwise.

## Data subjects and vulnerability

Potential data subjects include buyers, sellers, seller employees/agents, delivery contacts and people mentioned in support requests. Children may access public storefronts or the marketplace. A professionally reviewed age/child-data design is required: determine whether children are targeted or likely to use the service, minimise age data, obtain parental/guardian consent where required, and provide age-appropriate information. A checkbox alone does not establish valid parental consent.

## Principal risks and proposed mitigations

| Risk | Potential impact | Proposed mitigation | Evidence required |
|---|---|---|---|
| Account takeover/credential exposure | Unauthorised access | Strong password hashing, admin session revocation, MFA assessment, rate limits, secret rotation | Security test/configuration |
| Cross-tenant data leakage | Seller sees another seller's data | Store-scoped queries, ownership checks, negative tenant-isolation tests | Automated test suite |
| Over-retention | Unnecessary exposure | Record-level schedule, deletion/anonymisation jobs, backup expiry/restore controls | Approved schedule and deletion test |
| Excessive seller visibility | Buyer data exposed beyond fulfilment | Field minimisation, least-privilege views, access logging | Role/access matrix |
| Vendor/transfer uncertainty | Loss of control or unlawful transfer | Vendor due diligence, DPAs, transfer assessment and region evidence | Completed vendor register |
| Child data without safeguards | Harm to vulnerable users | Age-appropriate UX, parental consent where required, minimisation, no profiling/marketing to children | Legal/DPO-approved assessment |
| Rights requests incomplete | Requests unresolved across systems | Identity checks, export/correction/deletion runbooks, vendor coordination | End-to-end DSAR test |
| Slow incident escalation | Harm and missed deadline | 72-hour playbook, incident contact and tabletop | Exercise report |
| Automated decisions/profiling | Unfair significant effects | Inventory decision logic; human review/challenge for significant decisions | Rules/model inventory |

## Existing code observations

- Separate seller, customer and administrator authentication paths.
- Password hashes rather than plaintext passwords.
- Store ownership checks in seller routes and an admin-only privacy-request workflow.
- Production API HTTPS enforcement and security response headers.
- Privacy request validation, rate limiting and completion safeguards.
- Existing automated unit, browser and project-invariant checks.

These are repository observations only. They do not prove production configuration, vendor controls or every route is secure.

## Required before approval

Verify production data flows/volumes; complete ROPA, role allocation and lawful-basis/LIA assessments; verify vendors/DPAs/transfers; approve retention/deletion; complete child-data assessment; perform security and tenant-isolation testing; evaluate residual risks; obtain DPO vetting/signature and determine NDPC filing requirements; record conditions, owners and review date.

## Approval record

| Role | Evidence | Decision |
|---|---|---|
| Controller/operator | Pending private governance arrangement | Not approved |
| Accredited DPO | Not appointed | Not reviewed or signed |
| Nigerian privacy counsel/DPCO | Not engaged | Not reviewed |
