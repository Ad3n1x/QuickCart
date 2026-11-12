# QuickCart — Record of Processing Activities (working register)

**Status:** Engineering inventory draft; operator and qualified DPCO review required. The hosting topology below was checked against connected Vercel, Render and MongoDB Atlas account metadata on 2026-11-12. This is not a verified field-level production data inventory.

| Activity | Data categories visible in code | Purpose | Likely basis to assess (not a legal conclusion) | Systems / recipients | Open control |
|---|---|---|---|---|---|
| Seller registration | Name, email, phone, password hash, verification metadata | Account creation and security | Contract steps; security legitimate interests | Render API (Frankfurt), MongoDB Atlas (AWS US West/Oregon), Brevo | Registration retention, age/child-data approach, DPA/transfer assessment |
| Buyer registration | Name, email, phone, password hash, verification metadata | Account creation and security | Contract steps; security legitimate interests | Render API (Frankfurt), MongoDB Atlas (AWS US West/Oregon), Brevo | Age/child-data approach, closure and transfer safeguards |
| Store/catalogue | Seller/store identifiers, store settings, products, prices, stock, images | Operate seller storefronts | Contract; legitimate interests where justified | Vercel global CDN, Render API (Frankfurt), MongoDB Atlas (AWS US West/Oregon) | Identify personal data and payment configuration fields; assess image/object storage |
| Checkout/orders | Buyer name, phone, email where supplied, delivery address, order lines, amounts, payment method/status/reference, timestamps | Create, fulfil, support and reconcile orders | Contract; legal obligation where established | Vercel frontend, Render API (Frankfurt), MongoDB Atlas (AWS US West/Oregon), ALATPay, seller, delivery provider | Map payment payloads, seller access and international transfers |
| Customer relationship records | Customer contact details, notes and store-scoped history | Seller support and order management | Seller's lawful basis to assess | Render API, MongoDB Atlas, authorised seller | Controller/processor role per field; seller terms |
| Delivery | Delivery contact/address, courier details, assignment and status timeline | Deliver orders | Contract | Render API, MongoDB Atlas, seller and courier | Identify recipients and terms |
| Support/privacy requests | Requester name/email, request details, status, verification, notes, history | Resolve support and rights requests | Legal obligation / legitimate interests to assess | Render API (Frankfurt), MongoDB Atlas (AWS US West/Oregon), restricted admin, privacy mailbox | Approve retention, access review and transfer safeguards |
| Security/operational logs | Request/IP metadata, authentication and infrastructure logs | Security, availability, abuse prevention | Legitimate interests / legal obligation to assess | Render logs/service (Frankfurt), Vercel global platform/CDN, database/provider logs | Confirm exact fields, log locations, support access and expiry |
| Transactional email | Recipient email/name and message context | Verification, order updates, recovery | Contract / legitimate interests by message | Brevo | Region, subprocessors, DPA, retention and transfer assessment |
| Payment processing | Payment reference/status and transaction information | Accept/verify payments | Contract / legal obligation by record | ALATPay | Exact shared fields, region, DPA and PCI roles |

## Verified hosting topology (account metadata checked 2026-11-12)

- **Frontend:** Vercel project `quick-cart`, framework Vite. The production `VITE_API_URL` is configured to `https://quickcart-api-f7x7.onrender.com`. The project has the domain `quick-cart-three-chi.vercel.app`. Vercel's static CDN is global; the project metadata inspected did not establish a Vercel Function region.
- **API:** Render service `quickcart-api`, Node web service, Frankfurt, Germany, connected to `Ad3n1x/QuickCart` on `main`.
- **Database:** MongoDB Atlas `Project 0 / Cluster0`, AWS `US_WEST_2` (Oregon, USA), FREE tier, MongoDB 8.0.37.
- **Secret handling:** The Vercel project has a sensitive `MONGODB_URI` variable configured for production and preview, but its value was not retrieved or copied. This register does not store credentials or connection strings.

The resulting known topology includes API processing in Germany and database storage in the United States. Vercel's global CDN/platform may also process request and operational metadata outside Nigeria. These facts require a documented international-transfer assessment; they do not establish that the transfers have adequate safeguards.

## Required fields in the final ROPA

For every activity record: controller/processor role; purpose; data-subject categories; personal-data categories; lawful basis and any legitimate-interest assessment; recipients; international transfers and safeguards; retention period or criteria; security controls; system owner; and DPIA requirement/outcome.

## Role allocation

Do not assume QuickCart is controller for every seller record or processor for every seller activity. QuickCart likely determines purposes for platform accounts, platform security and platform support. Sellers may be independent controllers for their own customer/order purposes. The actual roles depend on who decides why and how data is used. Vendor roles must be confirmed from contracts and DPAs.

## Evidence required before sign-off

- Production database collection/field inventory and redacted sample documents.
- Production frontend storage, cookie, SDK, network and analytics inventory.
- Vercel, Render and MongoDB Atlas DPA, subprocessor, log-retention, backup and support-access evidence.
- Brevo and ALATPay region/subprocessor settings and signed processor/merchant agreements.
- Transfer assessment and safeguards for processing/storage outside Nigeria.
- Seller terms allocating privacy responsibilities.
- Approved retention schedule, lawful-basis assessments and DPO review.
