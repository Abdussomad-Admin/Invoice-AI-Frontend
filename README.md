# Invoice AI frontend

React + Vite frontend for the Invoice AI API. The cloud AI assistant and supplier-bill extraction use **Firebase AI Logic with the Gemini Developer API** from the web app.

## Complete source code

This repository includes the ASP.NET Core API source in [`backend-source/`](backend-source/) so judges can inspect and run the complete application from one public repository. The standalone canonical backend repository is [InvoiceAIBackend](https://github.com/Abdussomad-Admin/InvoiceAIBackend); the canonical frontend repository is [Invoice-AI-Frontend](https://github.com/Abdussomad-Admin/Invoice-AI-Frontend). The project is licensed under Apache 2.0.

## Run locally

```powershell
npm install
npm run dev
```

The frontend uses the hosted API in both development and production:

`https://invoiceaibackend-yk9n.onrender.com`

During local development, Vite proxies `/api` calls to the hosted backend. Production builds call the hosted API directly. Set `VITE_SERVER_API_BASE_URL` only if you need to change that API address. The hosted API's `Cors__AllowedOrigins__0` setting must include the deployed frontend origin for production browser requests; this CORS setting is managed on the backend host.

## Firebase AI Logic

The main **Ask Invoice AI** flow uses Firebase AI Logic hybrid inference for general bookkeeping and business-help questions: it prefers Chrome's on-device model, then falls back to cloud Gemini when the local model is unavailable. Each reply labels where inference ran. Questions that ask about a user's saved invoices, payments, customers, supplier bills, or business figures use the cloud Gemini assistant and its read-only financial tools instead. Each tool call goes through the Invoice AI API, which rechecks the signed-in user's JWT, workspace membership, permission, and rate limit before returning tenant-scoped records. Financial tool results are sent to Gemini so it can explain them; the model does not get direct database access or write permissions.

The assistant uses one **Send** action and selects the route automatically: general questions prefer the on-device model and fall back to cloud when needed, while workspace-record questions use the permission-checked cloud assistant. Replies label the route used. General questions can run offline after Chrome has prepared its model; record questions need the online workspace service. Uploaded files and image generation use cloud features because the local model cannot process the app's files, images, or financial tools.

Supplier-bill reading also runs in the browser through Firebase AI Logic. The uploaded document is sent only after the user starts extraction. Invoice AI's API checks the user's permission and plan allowance before the Firebase request, then validates the extracted values, checks suppliers and duplicates, and saves a review record. A person must still review the result; AI never finalizes a bill.

Firebase is configured once for the hosted Invoice AI app. End users do not need their own Firebase project, Gemini key, or Firebase sign-in. Firebase web configuration and the App Check site key are public browser settings, not service-account secrets. App Check helps protect requests to Firebase AI Logic; Invoice AI's API separately enforces its own authentication, workspace, and role permissions.

To configure it:

1. In Firebase Console, select the Invoice AI project and enable **AI Logic** with the **Gemini Developer API** provider.
2. Add the Firebase web-app values from `.env.example` as frontend environment variables (`VITE_FIREBASE_*`) in local development and production hosting (for example, Vercel).
3. Register the production web app in Firebase App Check with the reCAPTCHA Enterprise provider. Set `VITE_FIREBASE_APPCHECK_SITE_KEY` to that provider's site key in Vercel. Do not use a debug token in production.
4. For localhost, the app initializes Firebase's App Check debug provider. Copy its generated debug token from the browser console and safelist that token in Firebase App Check.

Cloud model requests need an internet connection. Firebase App Check is required for production cloud requests. Hybrid on-device inference requires desktop Chrome 139 or newer, a supported device, and Chrome's Prompt API model. The first model download needs an internet connection and may take several minutes. If the local model is unavailable, general questions automatically fall back to cloud Gemini; the reply indicates that the question was sent online. Once prepared, local-only questions can work offline while the page remains open. Workspace records always use the permission-checked cloud assistant.

### Hybrid inference demo path

1. Open the deployed app in supported desktop Chrome while online and sign in.
2. Ask a general question such as **“How can I politely remind a customer about a late invoice?”** The reply shows whether Chrome's local model answered or Firebase AI Logic used cloud fallback.
3. Ask **“Which invoices are overdue?”** to demonstrate the separate cloud path that checks only records available to the signed-in user's role.
4. Use **On-device** for a local-only general question. After preparing the model, disconnect the network while keeping the page open and repeat the question to demonstrate offline inference.

The project supports the Web/Chrome platform. For contest submission, include the hosted demo, this source repository, an English description of what was built during the contest, and a public YouTube demo video under three minutes.

Review Firebase's current [AI Logic setup](https://firebase.google.com/docs/ai-logic/get-started?platform=web), [function-calling guide](https://firebase.google.com/docs/ai-logic/function-calling), [App Check guide](https://firebase.google.com/docs/ai-logic/app-check), and [pricing and data-use details](https://firebase.google.com/docs/ai-logic/pricing?api=dev) before production use.
