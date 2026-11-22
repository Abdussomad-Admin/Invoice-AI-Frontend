# Invoice AI frontend

React + Vite frontend for the Invoice AI API.

## Run locally

```powershell
npm install
npm run dev
```

The frontend uses the hosted API in both development and production:

`https://invoiceaibackend-yk9n.onrender.com`

During local development, Vite proxies `/api` calls to the hosted backend. Production builds call the hosted API directly. Set `VITE_SERVER_API_BASE_URL` only if you need to change that API address. The hosted API's `Cors__AllowedOrigins__0` setting must include the deployed frontend origin for production browser requests; this CORS setting is managed on the backend host.

## Optional on-device AI help

The Financial Assistant has an **On-device help** option powered by Firebase AI Logic's web on-device inference. It runs in `ONLY_ON_DEVICE` mode, so the prompt is not sent to a cloud model. This is for general explanations and writing help; it cannot read Invoice AI records, call financial tools, or replace the normal **Ask Invoice AI** workflow.

Firebase is configured once for the hosted Invoice AI app. Every user who visits the deployed frontend can use that same integration; they do not need their own Firebase project, API key, or Firebase sign-in. The Firebase web config and App Check site key are public frontend settings, so App Check and the enabled Firebase AI Logic project—not hiding those values—protect the integration.

To enable it:

1. In Firebase Console, create/select a project, register a web app, and enable **AI Logic**. Complete the Firebase AI Logic setup so App Check is enforced.
2. Copy that Firebase web app's config values to the `VITE_FIREBASE_*` settings shown in `.env.example`. These are browser config values, not private service-account credentials.
3. In Firebase App Check, register a production web attestation provider and set `VITE_FIREBASE_APPCHECK_SITE_KEY` to its reCAPTCHA Enterprise site key in the production hosting environment (for example Vercel). Do not put a debug token in production or commit one.
4. For localhost only, the app uses Firebase's App Check debug provider. Open the browser console, copy the generated debug token, and safelist it in Firebase App Check for development. Keep that token private.
5. Use desktop Chrome 139 or newer. Enable Chrome's Prompt API flag (`chrome://flags/#prompt-api-for-gemini-nano-multimodal-input`) if needed, restart Chrome, then choose **On-device help** once while online. The first model download may take several minutes and needs device storage.

After the model is ready, general on-device help can work offline while the current app page remains open. Reloading the page or starting a new browser session while offline is not guaranteed to work because the app must initialize Firebase/App Check again. Invoice AI itself is not fully offline: sign-in, records, payments, and the regular record-aware assistant still need the API and network. On-device inference is currently limited to supported desktop Chrome; other browsers and mobile devices should use the regular assistant when online.

This implementation uses single-turn text only. Firebase's on-device inference does not support multi-turn chat, workspace tool calls, or financial-record retrieval. Review the [Firebase AI Logic web hybrid guide](https://firebase.google.com/docs/ai-logic/hybrid/web/get-started) for current browser support, setup, and limitations.
