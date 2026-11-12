# QuickCart — Record of Processing Activities (working register)

**Status:** Engineering inventory draft; operator and DPCO review required. This is not a verified production data inventory.

| Activity | Data categories visible in code | Purpose | Likely basis to assess (not a legal conclusion) | Systems / recipients | Open control |
|---|---|---|---|---|---|
| Seller registration | Name, email, phone, password hash, verification metadata | Account creation and security | Contract steps; security legitimate interests | API, MongoDB, Brevo | Unverified registration retention |
| Buyer registration | Name, email, phone, password hash, verification metadata | Account creation and security | Contract steps; security legitimate interests | API, MongoDB, Brevo | Age/child-data approach and closure |
| Store/catalogue | Seller/store identifiers, store settings, products, prices, stock, images | Operate seller storefronts | Contract; legitimate interests where justified | MongoDB, Vercel, Render | Identify personal data and payment configuration fields |
| Checkout/orders | Buyer name, phone, email where supplied, delivery address, order lines, amounts, payment method/status/reference, timestamps | Create, fulfil, support and reconcile orders | Contract; legal obligation where established | MongoDB, ALATPay, seller, delivery provider | Map payment payloads and seller access |
| Customer relationship records | Customer contact details, notes and store-scoped history | Seller support and order management | Seller's lawful basis to assess | MongoDB, authorised seller | Controller/processor role per field |
| Delivery | Delivery contact/address, courier details, assignment and status timeline | Deliver orders | Contract | MongoDB, seller and courier | Identify recipients and terms |
| Support/privacy requests | Requester name/email, request details, status, verification, notes, history | Resolve support and rights requests | Legal obligation / legitimate interests to assess | MongoDB, restricted admin, privacy mailbox | Approve retention and access review |
| Security/operational logs | Request/IP metadata, authentication and infrastructure logs | Security, availability, abuse prevention | Legitimate interests / legal obligation to assess | Render, Vercel, database, vendors | Confirm fields, access, location and expiry |
| Transactional email | Recipient email/name and message context | Verification, order updates, recovery | Contract / legitimate interests by message | Brevo | Region, subprocessors, DPA, retention |
| Payment processing | Payment reference/status and transaction information | Accept/verify payments | Contract / legal obligation by record | ALATPay | Exact shared fields, region, DPA and PCI roles |

## Required fields in the final ROPA

For every activity record: controller/processor role; purpose; data-subject categories; personal-data categories; lawful basis and any legitimate-interest assessment; recipients; international transfers and safeguards; retention period or criteria; security controls; system owner; and DPIA requirement/outcome.

## Role allocation

Do not assume QuickCart is controller for every seller record or processor for every seller activity. QuickCart likely determines purposes for platform accounts, platform security and platform support. Sellers may be independent controllers for their own customer/order purposes. The actual roles depend on who decides why and how data is used. Vendor roles must be confirmed from contracts and DPAs.

## Evidence required before sign-off

- Production database collection/field inventory and redacted sample documents.
- Production frontend storage, cookie, SDK, network and analytics inventory.
- Render, Vercel, MongoDB, Brevo and ALATPay region/subprocessor settings.
- Signed processor agreements and transfer safeguards.
- Seller terms allocating privacy responsibilities.
- Approved retention schedule, lawful-basis assessments and DPO review.
