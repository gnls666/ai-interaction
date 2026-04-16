# AI Interaction

An AI workspace prototype built with React, Vite, and shadcn/ui. The UI is tuned around a calm ChatGPT-like layout with:

- centered chat flow
- model selection
- tool toggles
- file upload
- tool and artifact timeline
- on-demand artifact inspector
- a local Copilot SDK server with CLI fallback
- runtime-discovered model and tool capabilities

## Commands

```bash
pnpm install
pnpm dev
pnpm agent:server
pnpm test
pnpm lint
pnpm build
```

The Vite app runs on the usual dev port. The local agent server exposes a Copilot SDK first HTTP endpoint for the front-end demo and falls back to the installed Copilot CLI when the SDK path is unavailable.

## Single-file Template

This project can be packed into one JSON template file and restored later.

```bash
pnpm template:pack
pnpm template:unpack
```

The packed file is written to `templates/ai-interaction.template.json`.

You can also unpack into a custom target:

```bash
node scripts/template-bundle.mjs unpack templates/ai-interaction.template.json /absolute/target --force
```

## Notes

- `output/`, `.playwright-cli/`, and `.copilot-uploads/` are local-only and ignored by git.
- The template bundle includes source files, public assets, fonts, and the Copilot SDK runtime server.
