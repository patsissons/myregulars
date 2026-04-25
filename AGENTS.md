<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# myregulars

A web app for tracking names of regulars at regularly visited local venues.

## Core rules

- Always run `npm run format-and-validate` to validate your code before committing. This single command covers formatting, type checking, linting, and tests — do not run any of these separately as an additional verification step.

## Stack

- Next.js App Router, TypeScript strict mode
- Tailwind for styling
- Data layer: bring-your-own datastore via pluggable adapters (`src/lib/datastore/`). v1 provider is GitHub Gists (one Gist = one vault). Vaults are JSON documents validated with Zod. All datastore access goes through `src/lib/db.ts`.

## Conventions

- Server components by default. Only use `"use client"` when you actually need interactivity.
- All database access goes through `src/lib/db.ts`. No inline SQL in components.
- Route handlers live in `src/app/api/`. Co-locate tests as `*.test.ts` next to the file.
- No `any` types. If you can't type it, ask in the output.
- Formatting is handled automatically by the harness (Prettier). Don't worry about whitespace or class ordering.

## Testing

### Unit / component tests (Vitest)

- Co-locate tests next to the source file: `foo.ts` -> `foo.test.ts`, `Button.tsx` -> `Button.test.tsx`
- Import test utilities explicitly: `import { describe, it, expect } from "vitest"`
- For React components: `import { render, screen } from "@testing-library/react"`
- Run: `npm test` (or `npm test -- --passWithNoTests` if there may be no tests)
- Config: `vitest.config.ts`

Example unit test:

```ts
import { describe, it, expect } from "vitest";
import { myFunction } from "./myModule";

describe("myFunction", () => {
  it("returns expected value", () => {
    expect(myFunction("input")).toBe("output");
  });
});
```

Example component test:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MyComponent } from "./MyComponent";

describe("MyComponent", () => {
  it("renders heading", () => {
    render(<MyComponent />);
    expect(screen.getByRole("heading")).toHaveTextContent("Hello");
  });
});
```

### E2E tests (Playwright)

- E2E tests live in `e2e/` directory (not co-located with source), named `*.spec.ts`
- Run: `npm run test:e2e`
- Playwright auto-starts a Next.js dev server on a dynamic port
- Config: `playwright.config.ts`

### Important notes

- **Server components** cannot be rendered with React Testing Library. Test the underlying logic as unit tests and verify rendering via E2E tests.
- **`next/image`** needs mocking in component tests: `vi.mock("next/image", () => ({ default: (props: any) => <img {...props} /> }))`
- **`next/font`** needs mocking in component tests if used.

## What "done" means

A task is done when:

- `npm run format-and-validate` passes
- The change is minimal and does not touch unrelated files
