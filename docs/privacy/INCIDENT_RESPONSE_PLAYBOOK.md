# QuickCart — Personal data incident response playbook

**Status:** Operational draft. Keep a current, access-controlled copy with the incident coordinator. This does not replace legal advice or a provider-specific security plan.

## Trigger

Treat suspected unauthorised access, disclosure, alteration, loss, destruction, ransomware, exposed credentials, misdirected email/export, compromised admin account, misconfigured database/storage, or a vendor incident involving QuickCart personal data as an incident until triaged.

## First response

1. Record when detected and when the operator became aware. Start the statutory 72-hour assessment clock immediately.
2. Preserve logs, request IDs, deployment IDs, timestamps, affected systems and evidence. Never paste personal data or credentials into public tickets.
3. Contain safely: revoke compromised sessions/tokens/keys, restrict access, disable exposed endpoints/integrations, rotate secrets and isolate affected resources where appropriate.
4. Do not destroy evidence or make untested changes that worsen the incident.
5. Contact relevant hosting/database/email/payment providers through verified incident channels. Request containment, scope, affected regions, subprocessors and timeline.
6. Maintain a written incident log with actions, owners and timestamps.

## Risk assessment

Record what happened, when, systems/datasets/purposes involved, categories and approximate number of people and records, whether credentials/contact details/addresses/order/payment references/sensitive or child data were involved, whether data was exfiltrated/altered/public, likelihood and severity of harm, containment and mitigation, and whether a processor/vendor or seller must notify a controller.

## Regulatory and individual notification

- Under NDPA section 40(2) and GAID Article 33, notify NDPC within 72 hours of becoming aware of a breach likely to result in a risk to individuals' rights and freedoms.
- Where a breach is likely to result in high risk to affected individuals' rights and freedoms, communicate with affected data subjects immediately in clear language, including likely consequences and practical protective steps.
- Record the threshold decision and reasons even if notification is not required.
- Coordinate with vendors, sellers and other controllers/processors without delaying required notification.
- Do not assume an incident is not reportable merely because a provider is still investigating.

## Notification contents

- Nature and circumstances of loss, unauthorised access or disclosure.
- Date/time or estimated period and discovery.
- Categories and approximate number of affected people and records.
- Types of personal data involved.
- Likely consequences and risk assessment.
- Measures taken/proposed to contain, remediate and mitigate.
- Approved point-of-contact details.
- Information still under investigation and expected follow-up.

## Recovery and closure

- Restore from known-good backups only after addressing the entry point.
- Rotate secrets, invalidate affected sessions, verify admin access and tenant isolation.
- Test for persistence, unauthorised changes and exfiltration.
- Notify affected vendors and sellers as appropriate.
- Complete root-cause analysis and corrective actions.
- Update ROPA, DPIA, security schedule and privacy notice where needed.
- Retain incident file under the approved retention schedule with restricted access.

## Tabletop exercise

Run and document an exercise at least annually and after material architecture changes. Scenarios: exposed database credential; compromised admin session; public file/object exposure; Brevo recipient misdelivery; payment-provider incident. Record response times, missed dependencies and remediation owners.
