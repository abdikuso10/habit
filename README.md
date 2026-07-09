# Yawm Wahid — يوم واحد (Day One)

A personal 365-day discipline tracker. Everything lives in your browser's
`localStorage` — there is no backend, no account, and no analytics. Back up
your data yourself with the export/import tools in the app.

## Local development

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). On first run you'll be
asked to set a password and pick your Day One date. That password is hashed
with SHA-256 and stored only on this device — it's a privacy screen against
casual snooping, not real security.

Other useful commands:

```bash
npm run build   # production build
npm run start   # run the production build locally
npm run lint    # eslint
```

## Deploying to Vercel

This is a static, backend-free Next.js app, so deployment is zero-config:

1. Push this repository to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo, or run
   `npx vercel` from this directory and follow the prompts.
3. No environment variables or build settings are required.

Because all data lives in the browser, each device/browser you open the
deployed app in starts fresh — use **Export backup** / **Import backup** to
carry your progress between them.
