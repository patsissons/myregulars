<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# myregulars (app)

A web app for tracking names of regulars at regularly visited local venues.

## Stack

- Next.js App Router, TypeScript strict mode
- Tailwind for styling
- Data layer: _TBD_ (some sort of bring-your-own database solution)

## Conventions

- Server components by default. Only use `"use client"` when you actually need interactivity.
- All database access goes through `src/lib/db.ts`. No inline SQL in components.
- Route handlers live in `src/app/api/`. Co-locate tests as `*.test.ts` next to the file.
- No `any` types. If you can't type it, ask in the output.
- Formatting is handled automatically by the harness (Prettier). Don't worry about whitespace or class ordering.

## What "done" means

A task is done when:

- `npm run format:check` passes
- `npm run lint` passes
- `npm run typecheck` passes
- `npm test` passes
- The change is minimal and does not touch unrelated files
