# QuickCart — Vendor and cross-border transfer register

**Status:** Unverified inventory based on repository configuration. Provider legal entities, data centres, support-access locations, subprocessors and transfer mechanisms have not been verified from contracts or production account settings. No provider location is assumed.

| Provider | Observed role | Data potentially handled | Region / onward transfer | Required evidence |
|---|---|---|---|---|
| MongoDB | Database | Accounts, stores, products, orders, delivery, CRM, privacy requests | UNKNOWN — verify cluster, backups, support access, subprocessors | Region evidence, DPA, security terms, transfer safeguards |
| Vercel | Frontend hosting/deployment | Web requests, IP/request metadata, deployment/runtime data | UNKNOWN — verify project regions, logs, edge processing, subprocessors | DPA, region settings, log retention, subprocessors |
| Render | API hosting | API requests, runtime logs, environment configuration and database transit | UNKNOWN — verify service region, logs, backups, support access | DPA, region settings, log policy, subprocessors |
| Brevo | Transactional email | Recipient email/name, verification, order and recovery messages | UNKNOWN — verify sending region, logs, support access, subprocessors | DPA, transfer terms, retention and deletion |
| ALATPay | Payment services | Payment references/status and transaction data sent/returned by integration | UNKNOWN — verify legal entity, region and downstream recipients | Merchant agreement, DPA/privacy terms, security/PCI responsibilities |
| Seller-selected couriers | Delivery recipients where used | Buyer name, phone, delivery address, order reference and instructions | Varies by seller/provider | Seller declaration, role, notice and transfer checks |

## Required checks for each provider

1. Identify contracting legal entity and whether it acts as processor, independent controller or another recipient for each service.
2. Record primary/backup data locations, support-access countries, subprocessors and onward transfers.
3. Obtain and review DPA/security terms covering confidentiality, instructions, security, rights-request assistance, breach notice, deletion/return and audit provisions.
4. Where personal data leaves Nigeria, document the lawful transfer basis and safeguards required by NDPA/GAID. Do not assume global provider terms alone prove adequacy.
5. Confirm rights-request and breach escalation contacts, notification timelines, retention and deletion mechanisms.
6. Recheck after material vendor, plan, region, feature or subprocessor changes.

## Release gate

The public privacy notice must not imply transfer compliance is verified. Replace every UNKNOWN with evidence-backed facts and have the register reviewed by a qualified Nigerian DPCO/privacy professional before final publication.
