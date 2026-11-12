# QuickCart — Security and privacy maintenance schedule

**Status:** Proposed operational schedule. Assign owners privately before launch; a schedule alone is not evidence that checks occurred.

| Frequency | Check | Evidence |
|---|---|---|
| Every deployment | Dependency/build checks, unit/browser tests, secret scanning, changed permissions and environment review | CI run and release checklist |
| Weekly | Review admin sign-ins, suspicious authentication, failed requests, runtime errors and exposed secrets | Restricted security log |
| Monthly | Review admin accounts, MongoDB roles, Vercel/Render team access, Brevo/ALATPay permissions and backups | Access review |
| Monthly | Check dependency advisories and apply supported security updates | Dependency report/PR |
| Quarterly | Test tenant isolation, rights requests, backup restore, deletion/retention and incident escalation | Test results |
| Quarterly | Review vendor regions, subprocessors, DPAs, transfer safeguards and log retention | Updated vendor register |
| Annually | Privacy/security training or documented solo-operator refresher; incident tabletop; privacy audit | Training/exercise record |
| Material change | Update ROPA, DPIA, notice, lawful-basis assessment and controls | Change assessment |

## Baseline controls to verify

- Unique high-entropy production secrets and dedicated PRIVACY_HASH_SECRET; no secrets in frontend builds or repository.
- Least-privilege MongoDB credentials and network restrictions.
- Password hashing; no plaintext passwords or OTPs in logs.
- Admin session revocation and rate limits on sensitive authentication endpoints.
- HTTPS, secure response headers, strict CORS and request-size limits.
- Input validation, output encoding and CSP/XSS review.
- Store-scoped ownership checks for every seller resource.
- No production personal data in tests, screenshots, CI artifacts or public issues.
- Encrypted backups, access restrictions, restore tests and documented expiry.
- Verified vendor incident contacts and tested breach response.

A qualified security professional should review the controls and residual risk. CI passing alone does not establish that the platform is secure.
