# Openclow

A Next.js, React, TypeScript, and Tailwind workspace for AI chat and a local task checklist. This repaired version preserves the original dark UI and supports Hugging Face, Gemini, and OpenAI. Provider limits and pricing depend on your provider account; unlimited free AI is not promised.

## Run locally

Use Node 22.13.0 and npm 10.9.2. Run `npm ci`, then `npm run dev`, and open http://localhost:3000. Use `npm run typecheck`, `npm test`, and `npm run lint` for checks. `npm run build` produces the server application; `npm start` serves it.

## Provider credentials

Select a provider in Settings and enter your own API key. Keys remain in the current page's memory and are cleared on reload, while the selected provider, chats, and tasks are stored locally in your browser. Old saved keys are removed from localStorage during migration. Keys are sent over HTTPS to the app's server and then to the selected provider; avoid using the app on an untrusted host or shared device.

For optional owner-configured server credentials, copy `.env.example` to `.env.local` during local development or use protected runtime secrets in your deployment. Use `HUGGINGFACE_API_KEY`, `GEMINI_API_KEY`, or `OPENCLOW_OPENAI_API_KEY`. Openclow intentionally ignores the generic `OPENAI_API_KEY` to avoid consuming unrelated environment credentials. Do not use `NEXT_PUBLIC_` for secrets. Anyone accessing a public app with owner-configured credentials can consume their quota; use session-entered keys unless you add authentication and quotas.

Hugging Face tokens require Inference Providers permission. Provider model defaults can be changed with `HUGGINGFACE_MODEL`, `GEMINI_MODEL`, or `OPENCLOW_OPENAI_MODEL`. Settings explicitly selects a provider; there is no automatic cross-provider fallback.

## Deployment

This app needs a Node server: GitHub Pages cannot run Next.js POST API routes. Do not publish `out/` or put private keys into static build secrets. The included `Dockerfile` installs the lockfile, builds standalone Next.js output, and serves its production assets as a non-root user. It listens on `0.0.0.0` and honors `PORT`, default 3000. `/api/health` returns an unauthenticated success response.

The Manus project uses a container deployment and managed checkpoints. GitHub Actions runs CI only; it does not deploy to Pages. The original GitHub repository remains unchanged by this separate managed repair.

## Local data

Chat and task data are local to this browser and origin, not synchronized to an account. A new published URL does not automatically inherit data from the old URL. Tasks can be added directly without any AI key, with a category, priority, and optional due date. Completing or deleting a task affects only this browser. A task is not a scheduled reminder and does not send notifications.

## Repair details

The repair restores missing Tailwind PostCSS processing, replaces the static deployment mismatch, fixes storage hydration and malformed data handling, serializes chat requests, includes conversation context, makes provider failures retryable, and improves mobile navigation. Provider API errors are sanitized and empty/blocked responses receive a clear message. Automated provider tests mock upstream calls; they do not validate a real account's credential or quota.

Original source: https://github.com/rintuchowdory/openclow, commit f096a87. Provider documentation references are in `REPAIR-NOTES.md`.
