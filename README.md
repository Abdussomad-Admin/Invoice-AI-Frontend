# Invoice AI frontend

React + Vite frontend for the Invoice AI API. The cloud AI assistant and supplier-bill extraction use **Firebase AI Logic with the Gemini Developer API** from the web app.

## Run locally

```powershell
npm install
npm run dev
```

The frontend uses the hosted API in both development and production:

`https://invoiceaibackend-yk9n.onrender.com`

During local development, Vite proxies `/api` calls to the hosted backend. Production builds call the hosted API directly. Set `VITE_SERVER_API_BASE_URL` only if you need to change that API address. The hosted API's `Cors__AllowedOrigins__0` setting must include the deployed frontend origin for production browser requests; this CORS setting is managed on the backend host.

## Firebase AI Logic

The main **Ask Invoice AI** and dashboard insight flows call Firebase AI Logic in the browser using `gemini-3.8-flash`. The model can request only the read-only financial tools returned for the signed-in user's role. Each tool call goes through the Invoice AI API, which rechecks the user's JWT, workspace membership, permission, and rate limit before returning tenant-scoped records. Financial tool results are sent to Gemini so it can explain them; the model does not get direct database access or write permissions.

Supplier-bill reading also runs in the browser through Firebase AI Logic. The uploaded document is sent only after the user starts extraction. Invoice AI's API checks the user's permission and plan allowance before the Firebase request, then validates the extracted values, checks suppliers and duplicates, and saves a review record. A person must still review the result; AI never finalizes a bill.

Firebase is configured once for the hosted Invoice AI app. End users do not need their own Firebase project, Gemini key, or Firebase sign-in. Firebase web configuration and the App Check site key are public browser settings, not service-account secrets. App Check helps protect requests to Firebase AI Logic; Invoice AI's API separately enforces its own authentication, workspace, and role permissions.

To configure it:

1. In Firebase Console, select the Invoice AI project and enable **AI Logic** with the **Gemini Developer API** provider.
2. Add the Firebase web-app values from `.env.example` as frontend environment variables (`VITE_FIREBASE_*`) in local development and production hosting (for example, Vercel).
3. Register the production web app in Firebase App Check with the reCAPTCHA Enterprise provider. Set `VITE_FIREBASE_APPCHECK_SITE_KEY` to that provider's site key in Vercel. Do not use a debug token in production.
4. For localhost, the app initializes Firebase's App Check debug provider. Copy its generated debug token from the browser console and safelist that token in Firebase App Check.

The model needs an internet connection. Firebase App Check is required for the production AI requests. The separate **On-device help** option remains available on supported desktop Chrome for general, non-record-specific questions; once its model has been prepared, it may work offline while the current page remains open. It cannot read workspace data or replace the Firebase cloud assistant.

Review Firebase's current [AI Logic setup](https://firebase.google.com/docs/ai-logic/get-started?platform=web), [function-calling guide](https://firebase.google.com/docs/ai-logic/function-calling), [App Check guide](https://firebase.google.com/docs/ai-logic/app-check), and [pricing and data-use details](https://firebase.google.com/docs/ai-logic/pricing?api=dev) before production use.
