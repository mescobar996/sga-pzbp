<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/b794c53b-a898-4b3b-a5b0-4f8cfb63fa64

## Git / PR troubleshooting

Si una rama de PR queda trabada por cambios locales, rebase, checkout o errores como `import: command not found` al intentar abrir archivos `.tsx`, seguí la guía de recuperación: [docs/git-pr-recovery.md](docs/git-pr-recovery.md).

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
