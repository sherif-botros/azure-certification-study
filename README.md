# Sherif Be Azure Expert Solution Architect

Personal study guide for the Power Platform, Dynamics 365 and agentic AI certification path: PL-900, AB-400, AB-100.

- Live site: https://sherif-botros.github.io/azure-certification-study/
- Stack: Svelte 5, Vite, single-file build. Progress is saved in the browser (localStorage) and can be exported as JSON on the Assumptions tab.

## Develop

```powershell
npm install; npm run dev
```

## Test and build

```powershell
npm test; npm run build
```

## Update the study content

- Path, items, hours and links: `src/lib/data.js`
- Live-check extractors and baselines: `src/lib/verify.js`
- Schedule engine: `src/lib/schedule.js`

Push to `main` and GitHub Actions tests, builds and deploys to Pages.

## Note

Automatic checks against Microsoft Learn only run inside claude.ai (through the Microsoft Learn connector). On this site every time-sensitive item shows as manual. Verify against Microsoft Learn directly.
