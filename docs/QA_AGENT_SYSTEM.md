# QuickCart QA agent system

## What is included

QuickCart now has a repeatable QA pipeline on the existing implementation/business-os-phase-1 branch. It keeps the current production deployment and default branch untouched.

### Agent roles

The repository contains specialist agent instructions in .github/agents/:

- qa-orchestrator.agent.md — plans and coordinates the test matrix.
- qa-browser.agent.md — tests the customer storefront and seller access in desktop/mobile browsers.
- qa-security.agent.md — reviews API authentication, tenant isolation, validation and inventory/order integrity.
- qa-performance.agent.md — runs bounded local performance checks.
- qa-fixer.agent.md — reproduces confirmed bugs, makes minimal fixes and adds regression coverage.
- qa-verifier.agent.md — independently reruns the failing case and regression suite.

These are agent role instructions for a compatible coding agent; they are not six autonomous cloud processes or a claim that an LLM API is configured. The GitHub Actions workflow runs deterministic checks automatically. An agent runner/model integration can use these role files to coordinate investigation and repair.

## Automated checks

| Area | Implementation | Boundary |
|---|---|---|
| Static architecture | npm run check | Source invariants and syntax |
| Backend/API | Existing Node test suite | Isolated test harnesses |
| Browser | Playwright | Built frontend with mocked storefront API |
| Mobile | Playwright Pixel 7 emulation | Responsive layout and customer journey |
| Security | Existing API tests plus agent review instructions | No production probing |
| Dependency audit | npm audit summary | Critical vulnerabilities fail the job; full report is retained |
| Performance | npm run test:perf | 40 concurrent requests to local Vite preview only |

### Browser coverage currently added

- Public storefront renders catalogue items and sold-out states.
- Product search filters results.
- A guest can add an item and reach the guest checkout summary.
- Guest cart persists per store across reloads.
- Unauthenticated visitors are redirected away from the private seller dashboard.
- Mobile viewport has no horizontal page overflow at 360px.

The browser tests intercept the storefront API and use fixtures. They do not create real orders, send WhatsApp messages, or call payment providers.

## Run locally

    npm install
    npm run check
    npm test
    npm run build
    npx playwright install chromium
    npm run test:e2e
    npm run test:perf

Playwright runs desktop Chromium and mobile Chromium projects against the production build served by Vite Preview.

## Bug handling: reproduce -> fix -> verify

1. The QA coordinator records a reproducible defect, severity, failing command, and evidence.
2. The fixer works on a non-production branch, makes a minimal change, and adds a regression test.
3. The verifier independently runs the original reproduction and relevant full suites.
4. Changes remain in a reviewable pull request. No agent merges or deploys.

The current workflow does not automatically invoke a paid LLM or autonomously push fixes. That requires a separately configured coding-agent runner and credentials. Do not add model secrets to source control or print them in CI logs.

## Known limitations

- The storefront E2E tests use a mocked API. They validate the real frontend build but do not replace a live backend integration environment.
- Existing API route tests remain the source of backend regression coverage; expand them for tenant-isolation and inventory edge cases as those tests are implemented.
- Performance numbers are local CI smoke measurements, not production load-test or real-user metrics.
- Playwright mobile emulation is not a substitute for physical Android-device testing.
- No production deployment, live payment, or live WhatsApp test is performed by this pipeline.
