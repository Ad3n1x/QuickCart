# QuickCart — Vendor and cross-border transfer register

**Status:** Provider documentation and connected hosting settings researched on 2026-11-12. This is an evidence register, not legal sign-off. A provider's public DPA is not by itself proof that the correct customer entity/account has accepted it, that the DPA covers every processing activity, or that an international transfer is lawful under Nigerian law.

## Verified deployment topology and provider due diligence

| Provider | Role / contracting entity evidence | QuickCart configuration or published processing locations | Data potentially handled | DPA / security evidence | Outstanding account-specific evidence |
|---|---|---|---|---|---|
| **Vercel** | Vercel Inc., Delaware corporation, identified in its current DPA. | Connected project `quick-cart`, Vite frontend. Static content is served through Vercel's global CDN. The current production API base URL points to Render Frankfurt. Vercel's DPA says primary processing facilities are in the US, data may be processed in the US and wherever Vercel/subprocessors operate, and backups are globally replicated. | Frontend request/network metadata, deployment/build information, CDN and platform logs; customer data only to the extent routed through Vercel services. | Current public DPA updated 17 March 2026, effective 31 March 2026. It expressly applies to Pro and Enterprise customers. It includes subprocessor controls, return/deletion provisions, security schedules and international provisions. Subprocessor list: https://security.vercel.com. | Project account plan was not exposed by the connected project metadata. Confirm whether this account is Pro/Enterprise and whether the DPA is incorporated/accepted. Confirm exact CDN/log/telemetry/support data locations, retention, subprocessor list and whether any Functions are deployed and their actual region. Do not assume a single region for global CDN processing. |
| **Render** | Render Services, Inc., San Francisco, California, identified in Render's current Terms of Service and DPA. | Connected service `quickcart-api`: Node web service, Frankfurt, Germany, Free plan, one instance, connected to `Ad3n1x/QuickCart` branch `main`. Public API: https://quickcart-api-f7x7.onrender.com. | API request payloads, authentication/application processing, runtime/build logs and operational metadata; traffic from the API to MongoDB Atlas. | Render Terms of Service (last modified 10 July 2026) state that use of the service incorporates the DPA and Privacy Policy and that personal information may be transferred to and processed in the US. Public DPA (last modified 19 December 2024) identifies Render Services, Inc. as importer, incorporates standard contractual clauses, lists subprocessors at https://render.com/trust, and describes TLS 1.2+ in transit, encryption at rest, centralized logging/monitoring and annual SOC 2 / ISO 27001 audits. | Confirm actual accepted terms version and whether any service-specific exception applies. Obtain the live subprocessor list, support-access countries, backup/log locations and retention. Separate Frankfurt service compute from US company/usage/account-data processing; do not describe Render as Germany-only. |
| **MongoDB Atlas** | MongoDB Cloud Terms of Service (last updated 15 January 2026) name MongoDB, Inc., MongoDB Limited and MongoDB Serviços de Software no Brasil LTDA. Under the published rule, a customer located outside the Americas (excluding Brazil/Caribbean) and Japan has MongoDB Limited as counterparty; verify the account's contracting entity on its invoice/account agreement. | Connected Atlas project `Project 0`, cluster `Cluster0`, AWS `US_WEST_2` (Oregon, USA), FREE tier, MongoDB 8.0.37. Cluster was shown as IDLE when inspected. | Buyer/seller accounts, stores, products, orders, delivery, CRM and privacy-request records stored in the cluster. | MongoDB DPA (last updated 21 October 2024) is incorporated into the Cloud Terms of Service. It describes MongoDB as processor for uploaded Customer Personal Data, customer-selected deployment regions, data-subject request support, breach notification without undue delay and return/deletion subject to legal retention. AWS is listed as a cloud subprocessor for Atlas. | Confirm account invoice/counterparty, DPA version and account acceptance, complete subprocessor list, optional features/support access, backup/snapshot location and retention, restore/deletion behavior, and any data processed outside the selected deployment region. The US deployment region is verified; all other processing locations are not. |
| **Brevo** | Brevo's help material says its DPA is in its Terms of Service. Invoices may identify Sendinblue SAS (France) or Brevo GmbH (Germany); the actual QuickCart account invoice is needed to establish the counterparty. | No account-level Brevo settings or invoice were available in this review. Brevo states its database hosting is in the EU: OVH in France and Germany, Google Cloud storage in Belgium. It says data is copied at least three times across at least two geographic locations and backups are encrypted and performed at least weekly (sometimes more often). | Recipient email/name and message context for verification, order updates, account recovery and other transactional messages. | Public DPA is referenced in Brevo Terms of Service. Official storage-location and DPA help articles are available. | Verify QuickCart account entity using invoice, account region/plan, applicable DPA version, actual subprocessor list, sending/relay routing, support access, deletion/retention and any non-EU transfer. EU database hosting does not prove every support, telemetry or email-delivery event stays in the EU. |
| **ALATPay** | Public Privacy Policy describes ALATPay as data controller and its declaration refers to Wema Bank Plc. The July 2026 Merchant Terms should be checked against the exact agreement accepted by the QuickCart merchant account. | Processing/storage location and subprocessor countries are not established by the public materials reviewed. Do not assume Nigeria-only processing. | Payment references/status and transaction information sent to or returned from the gateway; exact fields must be confirmed from QuickCart's live integration and ALATPay account. | Public Merchant Terms include data protection provisions. Clause 36.5 says neither party will transmit, process or store the other party's personal/sensitive data outside Nigeria without prior written consent of the data subject. The terms also impose PCI DSS obligations and prohibit storage of CVV/CVC, full track/chip data, PIN/PIN block and other prohibited sensitive authentication data after authorisation. ALATPay's Privacy Policy describes disclosures within the Wema Group and to service providers and possible international transfers. | Obtain the executed merchant agreement, legal counterparty, current DPA/processor terms, data-field/API mapping, all processing locations and recipients, breach notice terms, retention/deletion, PCI responsibility and written confirmation of how clause 36.5 applies to QuickCart's known overseas hosting chain. Do not rely on a generic consent checkbox to cure a transfer issue. |
| **Seller-selected couriers** | Varies by seller and courier. | No single location; seller-selected provider and route determine recipient. | Buyer name, phone, delivery address, order reference and delivery instructions. | No common agreement verified. | Require seller declaration of courier/provider, role, country, data fields, privacy notice, retention and contract/safeguards before enabling the integration. |

## Known data-flow map

1. Buyer/seller browser connects to Vercel's globally distributed CDN/platform. Vercel states that its primary processing facilities are in the US and its backups are globally replicated; exact project-specific request/log/telemetry locations remain unknown.
2. Browser requests are sent to the Render API hosted in Frankfurt, Germany.
3. The Render API reads/writes the MongoDB Atlas cluster in AWS US West (Oregon). This creates a known Germany-to-US service/data path.
4. Transactional messages are sent through Brevo. Brevo's published database locations are France, Germany and Belgium; other delivery/support/subprocessor locations require confirmation.
5. Payment references/status are exchanged with ALATPay. Its actual data location and recipients have not been verified.
6. Delivery details may be disclosed to sellers and seller-selected couriers.

This means the platform's known processing is not Nigeria-only. Relevant identified jurisdictions include Germany, the United States, France and Belgium, plus Vercel's global infrastructure and any additional vendor/courier locations. These are facts about provider infrastructure and published documentation, not a completed legal transfer assessment.

## Nigerian transfer-law assessment — not a legal conclusion

- NDPA sections 41–43 govern transfers of personal data out of Nigeria. The controller/processor must identify an applicable route: adequate protection under section 42, or a permitted section 43 circumstance, and record the transfer basis and adequacy assessment.
- GAID 2025 Article 45 and Schedule 5 say the Schedule 5 assessment is to be used pending a further NDPC cross-border instrument. Schedule 5 describes NDPC adequacy decisions, NDPC-approved Cross-Border Data Transfer Instruments (CBDTIs), and specified other lawful grounds.
- Vendor DPAs, EU/UK Standard Contractual Clauses, a provider's GDPR certification, or a data-centre location do not automatically establish an NDPC-approved Nigerian transfer route. A Nigerian DPCO/privacy professional must assess each flow and document the applicable basis and safeguards.
- Contract performance, legal claims, vital interests, public interest and informed consent may be relevant only where the statutory and GAID conditions actually fit. A blanket privacy-policy statement or bundled consent is not a substitute for the required assessment.
- ALATPay's published Merchant Terms clause 36.5 may impose an additional contractual restriction on overseas transmission/processing/storage of the other party's data without prior written data-subject consent. Its application to QuickCart's architecture and the exact executed contract must be reviewed before relying on ALATPay.

## Required evidence checklist

1. Download and retain current account invoices, accepted terms, DPA versions and order forms for each provider.
2. Capture current provider subprocessor lists and subscribe to change notifications.
3. Obtain provider confirmation of data residency, backups, log/telemetry, support-access countries, breach escalation, retention and deletion.
4. Verify the Vercel plan and whether its current Pro/Enterprise DPA applies to this project.
5. Verify the MongoDB contracting entity on the account invoice and confirm any support/backup processing outside AWS US West.
6. Verify Brevo's contracting entity from its invoice and review the DPA in the actual account Terms of Service.
7. Obtain ALATPay's executed merchant contract, DPA/processor terms and API data-field inventory.
8. Complete a country-by-country NDPA section 41–43 / GAID Schedule 5 transfer assessment, with any required NDPC-approved instrument or other lawful basis and safeguards.
9. Update the public privacy notice and DPIA only with verified facts; identify any remaining uncertainty honestly.
10. Recheck on every material vendor, region, plan, feature, subprocessor or data-flow change.

## Release gate

The public privacy notice must not imply transfer compliance is verified. The Render/Germany, MongoDB/AWS US, Vercel/US-and-global and Brevo/EU flows are now documented from account metadata and public provider materials. The transfer basis, provider contracts, subprocessor/support/backup/log locations, ALATPay clause 36.5, and the final account-specific DPA evidence remain open. Obtain qualified Nigerian DPCO/privacy review before final publication or a compliance claim.

## Public evidence reviewed

- NDPC NDP Act-GAID 2025: https://ndpc.gov.ng/wp-content/uploads/2025/07/NDP-ACT-GAID-2025-MARCH-20TH.pdf
- Vercel DPA: https://vercel.com/legal/dpa
- Vercel global network and regions: https://vercel.com/docs/regions
- Render Terms: https://render.com/terms
- Render DPA: https://render.com/dpa
- Render regions: https://render.com/docs/regions
- MongoDB Cloud Terms: https://www.mongodb.com/legal/terms-and-conditions/cloud
- MongoDB DPA: https://www.mongodb.com/legal/data-processing-agreement
- MongoDB subprocessors: https://www.mongodb.com/products/platform/trust/subprocessors
- Brevo storage location: https://help.brevo.com/hc/en-us/articles/360001005510-Data-storage-location
- Brevo DPA location: https://help.brevo.com/hc/en-us/articles/15403782599570-Where-can-I-find-the-Data-Processing-Agreement-DPA
- ALATPay Privacy Policy: https://alatpay.ng/privacy-policy
- ALATPay Merchant Terms: https://alatpay.ng/terms-and-conditions
