# Codex API Quickstart for SkillForge

This guide summarizes the minimum configuration needed to call the OpenAI Codex Completions API from SkillForge automation scripts. Use it alongside OpenAI's official API reference.

## 1. Authenticate safely

1. Create an OpenAI API key with access to Codex-capable models.
2. Store the key in your local environment as `OPENAI_API_KEY`. Never commit real keys—update `.env.example` with placeholder values and document any new variables.
3. For CI or ephemeral runs, inject the key using secrets management (e.g., GitHub Actions secrets) and export it at runtime only.

## 2. Minimal request payload

```bash
curl https://api.openai.com/v1/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "code-davinci-002",
    "prompt": "# SkillForge task...",
    "temperature": 0,
    "max_tokens": 600,
    "stop": ["```", "\n\n"]
  }'
```

Key parameters taken from OpenAI's Codex documentation:

- `model` – Prefer `code-davinci-002` for highest quality. Consider `code-cushman-001` if latency is critical.
- `prompt` – Provide repository context, acceptance criteria, and explicit output format requirements.
- `temperature` – Stick to `0` to keep generations deterministic.
- `max_tokens` – Size to the expected diff + buffer. Requests exceeding the context window will truncate.
- `stop` – Supply delimiters to avoid Codex continuing beyond the intended diff or command list.

## 3. Error handling and retries

- Treat HTTP `429` (rate limit) and `500` (server error) as retryable. Use exponential backoff with jitter.
- For `400`-level validation errors, log the payload (excluding secrets) and surface it to the operator for prompt refinement.
- Capture request/response IDs for audit trails in validation files.

## 4. Logging and observability

- Record `model`, `temperature`, `max_tokens`, and `stop` values in your validation evidence.
- When feasible, request `logprobs` to inspect token-level confidence and highlight risky generations to reviewers.
- Redact or hash any user-provided PII before storing logs.

## 5. Local development workflow

1. Confirm Docker DB is running (`docker compose up -d skillforge-db`).
2. Install dependencies (`cd apps/api && npm install`).
3. Export the API key in your shell and run the script or agent loop.
4. After testing, remove the key from your environment and run `docker compose down` if you no longer need the DB.

Following this quickstart keeps Codex integrations reproducible, auditable, and aligned with SkillForge security expectations.
