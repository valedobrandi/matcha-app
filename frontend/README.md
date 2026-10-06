# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Generated API types

`src/types/api.d.ts` is generated from the backend OpenAPI schema; do not edit it by hand. Prerequisite: the backend Python dependencies are installed (`pip install -r ../backend/requirements.txt`) and `python` on your PATH resolves to that environment. Then run `npm run gen:api` (no server needed). CI fails if the committed file is stale.

## End-to-end test (Playwright)

One journey (`e2e/discovery-like.spec.ts`): log in, open `/suggest`, open a profile, like it.
It needs a running stack; nothing is started for you.

1. Postgres migrated and seeded: from `backend/`, `python -m database.migrate && python -m database.seed --users 20`
   with `SEED_USERNAME` and `SEED_PASSWORD` set (all seeded users are verified and profile-complete,
   the first one is `SEED_USERNAME`, and all share `SEED_PASSWORD`).
2. Backend running, with `CORS_ORIGINS` including `http://127.0.0.1:5173`.
3. Vite dev server: `VITE_API_URL=<backend url> npm run dev -- --host 127.0.0.1 --port 5173`.
4. Once: `npx playwright install chromium`.
5. Run as the seed login: `E2E_USERNAME="$SEED_USERNAME" E2E_PASSWORD="$SEED_PASSWORD" npm run e2e`.

The spec likes one not-yet-liked profile per run, so it can be re-run until the seeded
profiles are exhausted; re-seed a fresh database to reset. `E2E_BASE_URL` overrides the
default.
