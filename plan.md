# Openclow repair

Repair the application cloned from `rintuchowdory/openclow` and publish a new Manus URL. The supplied old URL returns HTTP 404. Preserve the existing dark slate/indigo glassmorphism design, chat, three provider choices, and locally stored tasks; make only focused reliability and deployment corrections.

Use the repository's Next.js App Router with its server-side API endpoints, rather than a static GitHub Pages export, which cannot run those endpoints. Add a reproducible container build, health endpoint, and consistent Node/npm toolchain. Restore Tailwind's missing PostCSS processing. Keep provider credentials out of builds and client bundles. Provider keys remain optional server-side configuration or user-entered session settings; do not publish the sandbox's service key.

Make storage hydration safe and validated, serialize chat requests, preserve conversation context, keep transient provider errors retryable, update obsolete model configuration, and make the existing interface usable on narrow screens. Add direct task entry so task management works without an AI credential. Do not promise scheduled notifications: tasks are a local checklist.

## Project structure

`src/app/page.tsx` owns the existing UI. Small `src/lib` modules own persistence validation and shared provider request handling. `src/app/api/*/route.ts` implements provider endpoints and health. `public` holds the favicon and page-route manifest. Root configuration and `Dockerfile` describe styling, TypeScript, development, and published runtime. Tests cover affected provider and storage paths. The new managed repository keeps its own canonical history; the original GitHub repository is not overwritten.
