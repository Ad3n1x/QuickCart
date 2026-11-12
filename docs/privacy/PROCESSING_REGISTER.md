# QuickCart — Record of Processing Activities (working register)

**Status:** Engineering inventory draft; operator and qualified DPCO review required. Hosting topology was checked against connected Vercel, Render and MongoDB Atlas account metadata and public provider documentation on 2026-11-12. This is not a verified field-level production data inventory.

| Activity | Data categories visible in code | Purpose | Likely basis to assess (not a legal conclusion) | Systems / recipients and known locations | Open control |
|---|---|---|---|---|---|
| Seller registration | Name, email, phone, password hash, verification metadata | Account creation and security | Contract steps; security legitimate interests | Render API (Frankfurt; Render Services Inc. US), MongoDB Atlas (AWS US West/Oregon), Brevo (database hosting France/Germany/Belgium) | Registration retention, age/child-data approach, provider DPA and transfer assessment |
| Buyer registration | Name, email, phone, password hash, verification metadata | Account creation and security | Contract steps; security legitimate interests | Render API (Frankfurt; Render Services Inc. US), MongoDB Atlas (AWS US West/Oregon), Brevo (EU database hosting) | Age/child-data approach, closure and transfer safeguards |
| Store/catalogue | Seller/store identifiers, store settings, products, prices, stock, images | Operate seller storefronts | Contract; legitimate interests where justified | Vercel global CDN/US primary facilities, Render API (Frankfurt), MongoDB Atlas (AWS US West/Oregon) | Identify personal data and image/object storage; verify Vercel plan/DPA, logs and backup locations |
| Checkout/orders | Buyer name, phone, email where supplied, delivery address, order lines, amounts, payment method/status/reference, timestamps | Create, fulfil, support and reconcile orders | Contract; legal obligation where established | Vercel, Render API (Frankfurt; US provider/account data), MongoDB Atlas (AWS US West/Oregon), ALATPay, seller, courier | Map payment payloads, seller access, ALATPay terms and transfer safeguards |
| Customer relationship records | Customer contact details, notes and store-scoped history | Seller support and order management | Seller's lawful basis to assess | Render API, MongoDB Atlas, authorised seller | Controller/processor role per field; seller terms and courier recipients |
| Delivery | Delivery contact/address, courier details, assignment and status timeline | Deliver orders | Contract | Render API, MongoDB Atlas, seller and seller-selected courier | Identify recipient, country, terms, retention and transfer route |
| Support/privacy requests | Requester name/email, request details, status, verification, notes, history | Resolve support and rights requests | Legal obligation / legitimate interests to assess | Render API, MongoDB Atlas, restricted admin, privacy mailbox | Approve retention, access review and transfer safeguards |
| Security/operational logs | Request/IP metadata, authentication and infrastructure logs | Security, availability, abuse prevention | Legitimate interests / legal obligation to assess | Render service Frankfurt plus US company/usage processing, Vercel global platform/CDN and US primary facilities, MongoDB/provider logs | Confirm exact fields, log locations, support access, expiry and subprocessor list |
| Transactional email | Recipient email/name and message context | Verification, order updates, recovery | Contract / legitimate interests by message | Brevo database hosting in France/Germany/Belgium; possible other delivery/support processing not yet verified | Confirm invoice entity, DPA, subprocessors, sending/relay routing, retention and transfer assessment |
| Payment processing | Payment reference/status and transaction information | Accept/verify payments | Contract / legal obligation by record | ALATPay/Wema Group; location and recipients not verified | Obtain executed merchant terms, DPA, exact shared fields, clause 36.5 review and PCI responsibilities |

## Verified hosting topology and provider documentation (checked 2026-11-12)

- **Frontend:** Vercel project `quick-cart`, framework Vite. Production `VITE_API_URL` points to `https://quickcart-api-f7x7.onrender.com`. Static assets use Vercel's global CDN. Vercel's DPA says its primary processing facilities are in the US and backups are globally replicated. The public DPA expressly applies to Pro and Enterprise plans; the connected project metadata did not disclose the account plan. No project-specific Function region was established.
- **API:** Render service `quickcart-api`, Node web service, Frankfurt, Germany, Free plan, one instance, connected to `Ad3n1x/QuickCart` on `main`. Render Services, Inc. is the named provider in its Terms/DPA. Render's Terms also describe US processing of personal information, so Frankfurt is not the only relevant location.
- **Database:** MongoDB Atlas `Project 0 / Cluster0`, AWS `US_WEST_2` (Oregon, USA), FREE tier, MongoDB 8.0.37. MongoDB's DPA is incorporated into its Cloud Terms; AWS is a listed Atlas cloud subprocessor. The MongoDB contracting entity for a Nigeria-based account is expected to be MongoDB Limited under the published Cloud Terms counterparty rule, but the actual invoice/account agreement must confirm this.
- **Transactional email:** Brevo states that its database hosting is within the EU, with OVH in France/Germany and Google Cloud in Belgium; its published statement describes multi-location replication and encrypted weekly (or more frequent) backups. The QuickCart account's invoice entity and DPA version have not been checked.
- **Payments:** ALATPay's public Privacy Policy describes ALATPay as controller and refers to Wema Bank Plc. Its July 2026 Merchant Terms include a clause restricting overseas transmission/processing/storage of the other party's data without prior written data-subject consent. Actual account contract, exact processing location and API data fields are unknown.
- **Secret handling:** The Vercel project has a sensitive `MONGODB_URI` variable configured for production and preview, but its value was not retrieved or copied. This register does not store credentials or connection strings.

Known jurisdictions in the architecture/provider materials include Germany, the United States, France and Belgium, plus Vercel's global platform and any additional vendor/courier locations. The country list is a starting point for the transfer assessment, not proof that each flow is legally authorised.

## Nigerian cross-border transfer assessment

NDPA sections 41–43 and GAID 2025 Article 45 / Schedule 5 apply to personal data transferred outside Nigeria. For each flow, document whether an NDPC adequacy decision, NDPC-approved Cross-Border Data Transfer Instrument, or a specific lawful ground under the Act is relied upon; document safeguards, recipients, access to redress and the data-subject information. A provider's GDPR SCCs or DPA do not automatically equal an NDPC-approved Nigerian transfer instrument. Do not treat a generic privacy-policy acceptance as informed transfer consent. ALATPay clause 36.5 requires specific contract review against the architecture.

## Required fields in the final ROPA

For every activity record: controller/processor role; purpose; data-subject categories; personal-data categories; lawful basis and any legitimate-interest assessment; recipients; international transfers and safeguards; retention period or criteria; security controls; system owner; and DPIA requirement/outcome.

## Role allocation

Do not assume QuickCart is controller for every seller record or processor for every seller activity. QuickCart likely determines purposes for platform accounts, platform security and platform support. Sellers may be independent controllers for their own customer/order purposes. The actual roles depend on who decides why and how data is used. Vendor roles must be confirmed from contracts and DPAs.

## Evidence required before sign-off

- Production database collection/field inventory and redacted sample documents.
- Production frontend storage, cookie, SDK, network and analytics inventory.
- Vercel plan and applicable DPA; Render DPA/subprocessors; MongoDB invoice entity/DPA/subprocessors; Brevo invoice entity/DPA/subprocessors; ALATPay executed agreement/API data map.
- Provider backup, log, telemetry, support-access and deletion/retention evidence.
- Transfer assessment and safeguards for Germany, US, France, Belgium and any additional country identified.
- Seller terms allocating privacy responsibilities.
- Approved retention schedule, lawful-basis assessments and DPO review.
