# QuickCart — Vendor and cross-border transfer register

**Status:** Hosting topology partially verified from the connected production accounts on 2026-11-12. This records observed infrastructure settings only; it is not proof that provider contracts, DPAs, international-transfer safeguards, backup locations, support-access countries or subprocessors have been reviewed.

## Verified hosting topology

| Provider | Observed role | Verified deployment / location | Data potentially handled | Remaining uncertainty |
|---|---|---|---|---|
| MongoDB Atlas | Primary application database | Project `Project 0`, cluster `Cluster0`; AWS `US_WEST_2` (Oregon, USA); FREE tier; MongoDB 8.0.37; cluster state IDLE when checked | Buyer/seller accounts, stores, products, orders, delivery, CRM and privacy requests, as represented by the application | Backup/snapshot location and availability, support-access countries, subprocessors, retention, DPA and transfer safeguards not verified |
| Render | API hosting | Render service `quickcart-api`; Node web service; Frankfurt, Germany; free plan; repository `Ad3n1x/QuickCart`, branch `main`; public service `https://quickcart-api-f7x7.onrender.com` | API request data, authentication and application processing, runtime/build logs, environment configuration; data transit to MongoDB Atlas | Render DPA and contracting entity, log retention/location, support access, backup handling and subprocessors not verified |
| Vercel | Frontend hosting and deployment | Project `quick-cart`; Vite framework; production environment contains `VITE_API_URL` pointing to the Render API above; domains include `quick-cart-three-chi.vercel.app`; latest observed deployment state READY (deployment target was not identified by the project metadata) | Static frontend assets, request/network metadata and deployment/build data; browser-originated personal data is sent to the Render API | Project metadata did not expose a configured Function region. Static assets are served through Vercel's global CDN; applicable log retention, support access, contracting entity, DPA and subprocessors still require review |
| Brevo | Transactional email | Configured provider category observed in repository; account configuration not inspected in this review | Recipient email/name and message context for verification, order and recovery messages | Sending/data region, legal entity, subprocessors, DPA, retention and transfer safeguards not verified |
| ALATPay | Payment services | Configured provider category observed in repository; merchant configuration not inspected in this review | Payment references/status and transaction data sent/returned by integration | Legal entity, region, downstream recipients, DPA/privacy terms and PCI/security responsibilities not verified |
| Seller-selected couriers | Delivery recipients where used | Depends on seller and courier selection | Buyer name, phone, delivery address, order reference and instructions | Provider identity, role, location, terms and transfer safeguards vary |

## Cross-border data-flow observation

The connected account settings show the application database in AWS US West (Oregon) and the API service in Frankfurt, Germany. The Vercel frontend is delivered through a global CDN, and its production API base URL points to the Frankfurt Render service. Consequently, QuickCart processing and storage are not confined to Nigeria. The data path may include Nigeria-to-Germany API traffic and Germany-to-US database traffic, in addition to Vercel's global infrastructure and provider operational processing.

This is a factual location record, not a conclusion that the transfers are lawful. A qualified Nigerian privacy professional must assess the applicable NDPA/GAID transfer requirements, transfer mechanism and safeguards before the notice or DPIA describes transfers as compliant. Do not infer that every Vercel request is stored in one country or that CDN delivery identifies the location of all provider processing.

## Required checks for each provider

1. Identify the contracting legal entity and whether it acts as processor, independent controller or another recipient for each service.
2. Obtain the current DPA, security terms and subprocessor list; record their effective dates and review changes.
3. Confirm primary and backup data locations, support-access countries, logs, telemetry and onward transfers.
4. Confirm retention and deletion mechanisms, including backups and provider logs.
5. Where personal data leaves Nigeria, document the applicable transfer basis, assessment and safeguards required by NDPA/GAID. Do not assume global provider terms alone prove adequacy.
6. Confirm rights-request assistance, breach escalation contacts and notification timelines.
7. Recheck after material vendor, plan, region, feature or subprocessor changes.

## Release gate

The public privacy notice must disclose the relevant overseas processing/recipient categories accurately and must not imply that transfer safeguards are verified. Complete provider contract/DPA and subprocessor review, backup/log-location checks and a documented transfer assessment with a qualified Nigerian DPCO/privacy professional before final publication.
