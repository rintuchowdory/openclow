# Openclow repair notes

The supplied site returned HTTP 404 on 2026-10-17. The original GitHub Actions configuration published `out/`, but the project has server API routes and does not generate a static export. A server deployment is required. Tailwind directives also lacked a PostCSS configuration.

Provider documentation consulted on 2026-10-17:

- https://ai.google.dev/gemini-api/docs/deprecations — use a current Gemini model, configurable with `GEMINI_MODEL`, instead of the original hard-coded 1.5 Flash. The page recommends 3.5 Flash-Lite or 3.8 Flash for new projects.
- https://huggingface.co/docs/inference-providers/en/tasks/chat-completion — send structured conversation messages, use Inference Providers permission, and choose a currently supported model/provider combination rather than claiming unlimited free access.

Original repository: https://github.com/rintuchowdory/openclow at f096a87. This repair preserves the original UI and creates a separate managed repository; it does not overwrite the user's original GitHub history. Chat requires a valid provider credential. Existing chats/tasks are origin-local and do not automatically transfer to a new URL.
