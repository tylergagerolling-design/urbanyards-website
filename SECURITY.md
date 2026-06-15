# Security Policy

## Reporting a Vulnerability

Do not open a public issue for a suspected vulnerability or exposed secret. Report it privately to `team@urbanyards.us` with the affected URL, reproduction steps, and potential impact.

Urban Yards will acknowledge a valid report as soon as practical, investigate it, and coordinate remediation before public disclosure.

## Automated Controls

This repository runs CodeQL analysis, dependency review, Dependabot updates, secret scanning, backend tests, and production health monitoring. Production credentials belong only in the hosting provider's encrypted environment variables and must never be committed.
