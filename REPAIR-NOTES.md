# Openclow repair notes

The supplied site returned HTTP 404 on 2026-10-17. The original GitHub Actions configuration published `out/`, but the project has server API routes and does not generate a static export. A server deployment is required. Tailwind directives also lacked a PostCSS configuration.

Provider documentation consulted on 2026-10-17:

- https://ai.google.dev/gemini-api/docs/deprecations — use a current Gemini model, configurable with `GEMINI_MODEL`, instead of the original hard-coded 1.5 Flash. The page recommends 3.5 Flash-Lite or 3.8 Flash for new projects.
- https://huggingface.co/docs/inference-providers/en/tasks/chat-completion — send structured conversation messages, use Inference Providers permission, and choose a currently supported model/provider combination rather than claiming unlimited free access.

Original repository: https://github.com/rintuchowdory/openclow at f096a87. This repair preserves the original UI and creates a separate managed repository; it does not overwrite the user's original GitHub history. Chat requires a valid provider credential. Existing chats/tasks are origin-local and do not automatically transfer to a new URL.

## Provider migration: Gemini to Groq (2026-11-01)

The owner asked to run chat on Groq instead of Gemini. The `gemini` provider was removed from the code, routes, storage enum, tests, and docs, and replaced by a `groq` provider using the OpenAI-compatible endpoint `https://api.groq.com/openai/v1/chat/completions` with the server variable `GROQ_API_KEY` (model override `GROQ_MODEL`).

Default model is `qwen/qwen3.8-27b`. It was chosen over `openai/gpt-oss-120b` because gpt-oss models spend completion budget on a separate `reasoning` field and can return empty `content` when `max_tokens` is consumed, which this UI would report as a failed answer. Both were verified against the live account; available models on this key are listed by `GET https://api.groq.com/openai/v1/models`. Note that `llama-3.3-70b-versatile` is NOT available on this key.
