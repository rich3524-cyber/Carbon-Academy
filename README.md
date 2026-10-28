# Carbon Offroad Academy

Online product training portal for Carbon Offroad retail partners and customers. Short video lessons, 2–3 question quizzes, and the Carbon Certified program for retail staff and stores.

- Live site (planned): academy.carbonoffroad.com.au
- Owner: Carbon Offroad (KPD Industries Pty Ltd)
- Maintainer: Rich, Sales and Marketing Manager

## Status

Phase 1 (Foundation) in progress on branch `phase-1-foundation`. See `docs/BUILD_PLAN.md` for the current phase.

## Docs

| File | What it covers |
| --- | --- |
| `CLAUDE.md` | Instructions Claude Code reads every session: stack, rules, how to work in this repo |
| `docs/PRD.md` | Product requirements: audiences, flows, data model, open decisions |
| `docs/BUILD_PLAN.md` | Phased build plan with acceptance criteria and kick-off prompts |
| `docs/BRAND.md` | Build-ready extract of the Carbon Offroad Brand Guidelines v1.0, with page references and the brand owner's decisions |
| `docs/SECURITY.md` | How the ITWM Custom Website Security Framework v3.1 applies to the Academy (Tier C), with decisions and the data register |
| `docs/security/` | The full security framework (.docx) and the control evidence register |
| `docs/brand/` | Where your local copy of the full brand guidelines PDF goes. Git-ignored (internal and partner use) |
| `public/brand/` | Master logo SVGs from the Carbon asset library. Never edit or recreate |

## Stack

Next.js, TypeScript, Tailwind CSS, Supabase (Postgres, Auth, RLS), Vimeo, Netlify.

## Getting started

Needs Node.js LTS (version in `.nvmrc`) and Docker Desktop running.

```bash
npm install
npm run db:start          # local Supabase; prints the local keys
npm run db:reset          # apply migrations and seed
```

1. Copy `.env.example` to `.env.local`. Set `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` and the local publishable key.
2. Create `.env.test.local` with `SUPABASE_TEST_URL`, `SUPABASE_TEST_PUBLISHABLE_KEY` and `SUPABASE_TEST_SECRET_KEY`, all from `npx supabase status`.
3. Run `npm run dev` and open http://localhost:3000.

Before calling anything done:
- `npm run lint`, `npm run typecheck`, `npm test` and `npm run test:db` pass.
- The page has been checked at 375 px and 1280 px.
- The brand and security checks in `CLAUDE.md` are done.
