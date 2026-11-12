# QuickCart — Retention and deletion schedule

**Status:** Draft control framework. Exact periods require Nigerian legal/accounting review and operator approval. This is not an approved retention policy.

## Mandatory operating rules

1. Do not retain personal data indefinitely merely because an account remains open.
2. Keep each record only while necessary for its documented purpose and lawful basis.
3. When an account closes or a valid erasure request is approved, delete or irreversibly anonymise data no longer necessary.
4. Preserve only minimum fields required for a documented legal, accounting, fraud-prevention, dispute or security purpose. Record the reason, owner, review date and access restriction for every exception.
5. Do not delete records needed to complete an active order, resolve a payment dispute, comply with a legal hold or meet a verified statutory recordkeeping duty.
6. When an exception ends, remove retained personal data in the next controlled deletion run.
7. Apply the approved policy to primary databases, file storage, email provider records, application logs, exports and backups, with documented backup expiry and restore safeguards.
8. Privacy-request records are personal data too. Keep only what is needed to demonstrate the request, identity check, response and accountability. Set a counsel-approved period before adding a TTL index.

## Record schedule — periods intentionally pending approval

| Record group | Trigger | Disposal action | Period / criteria | Status |
|---|---|---|---|---|
| Unverified registrations | Registration started | Delete abandoned registration and verification metadata | Confirm applicable GAID rule and operational period | Approval required |
| Active account profile | Account created | Keep only fields needed to provide account/security | While active, with periodic necessity review | Initial operator preference recorded; review required |
| Closed account profile | Valid closure/erasure completed | Delete or anonymise profile, credentials, avatar and unnecessary identifiers | Promptly unless documented exception applies | Not automated |
| Orders/payment records | Order/payment created | Retain minimum transaction evidence; remove unnecessary contact/address data when no longer needed | Confirm Nigerian accounting, tax, payment and dispute rules | Approval required |
| Delivery details | Delivery requested | Remove address/contact after fulfilment and dispute window unless needed for a claim | Define per purpose and claim period | Approval required |
| Seller CRM/notes | Seller creates record | Delete when no longer needed; honour rights subject to exceptions | Seller/controller responsibilities and duration | Contract/workflow required |
| Support/privacy requests | Request received | Restrict access; delete unnecessary free text and identifiers after response/accountability period | Counsel-approved period | No TTL configured |
| Security logs | Event generated | Minimise identifiers, then delete | Risk-based period and legal review | Provider settings unknown |
| Backups/snapshots | Backup created | Expire under documented rotation; prevent routine use; reapply deletion after restore | Confirm provider settings | Vendor verification required |

## Deletion completion checklist

- Verify identity proportionately; never ask for passwords or full payment credentials.
- Identify relevant accounts without disclosing another person's data.
- Check active orders, disputes, legal holds, seller obligations and statutory recordkeeping requirements.
- Record each exception, basis, retained fields, access restriction and review date.
- Delete or irreversibly anonymise eligible profile, CRM, delivery, support, file and application records.
- Revoke sessions/tokens and remove unnecessary cached/browser data where under QuickCart control.
- Request vendor-side deletion/expiry where applicable and record confirmations.
- Document backup expiry and prevent deleted data being reintroduced on restore.
- Send a plain-language outcome to the verified requester.

**Do not enable automatic TTL deletion until periods and exception rules have been approved and tested.**
