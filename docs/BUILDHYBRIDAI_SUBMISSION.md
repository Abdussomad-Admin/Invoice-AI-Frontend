# #BuildHybridAI 2026 submission draft

This is a factual draft for the Devpost submission and a recording outline. Update the live demo details and confirm every behavior on the deployed build before submitting.

## Project title

Invoice AI: A Local-First Finance Assistant for Small Businesses

## Short description

Invoice AI helps freelancers and small businesses create invoices, track customer payments and supplier bills, and understand their recorded finances. General bookkeeping questions use Firebase AI Logic hybrid inference: the app prefers Chrome's on-device model and falls back to cloud Gemini when the local model is unavailable. Questions about a signed-in user's financial records use permission-checked cloud tools.

## Project description

Small businesses often manage invoices, payments, and supplier costs across disconnected tools. That makes it harder to understand what customers still owe, what has been paid, and how recorded income compares with expenses. Financial data is also sensitive, so a useful assistant should make clear when a question stays on the user's device and when it needs cloud processing to check business records.

Invoice AI combines everyday invoicing and financial record keeping with an assistant designed around that distinction. The user has one **Send** action: general questions use Firebase AI Logic with `PREFER_ON_DEVICE` and fall back to cloud Gemini when needed, while questions about saved records use the permission-checked cloud assistant. Replies label the inference path and tell the user when a general question was sent online. General questions can run offline after Chrome has prepared its model; workspace-record questions require the online workspace service.

When a user asks about their own invoices, payments, customers, supplier bills, or financial figures, the app uses the cloud assistant and read-only tools available to their account role. The Invoice AI API independently checks the user's authentication, workspace membership, and permissions for each tool request. The local model cannot see records or invoke those tools. File analysis and image creation also use cloud models because they are not supported by the local inference path used here.

## Firebase AI Logic implementation

- Firebase AI Logic is initialized in the web app with the Gemini Developer API and protected by Firebase App Check.
- General, non-record-specific questions use `InferenceMode.PREFER_ON_DEVICE`; the result's `inferenceSource` determines whether the UI labels the answer **Answered on device** or **Cloud fallback**.
- The app prepares Chrome's local model as part of the general-question flow and displays model availability and download progress. If the cloud request fails while the local model is ready, a general question can still be answered locally; no workspace records are available on this path.
- Record-specific prompts use Firebase AI Logic's cloud-hosted Gemini model with read-only financial tools returned for the signed-in role. The API checks permissions again before returning tenant-scoped results.
- User-visible notices distinguish local answers, cloud fallback, and workspace-record answers.

## Contest-period work summary

Invoice AI existed before the contest. During the submission period, the project was significantly updated to use Firebase AI Logic for the cloud financial assistant, add Firebase AI Logic on-device inference, and implement local-first/cloud-fallback hybrid inference for general questions. The assistant experience was also updated to show the inference path, clarify when cloud processing occurs, and route workspace-record questions through role-checked tools. The repository includes the frontend and backend source for review.

## Platform and links

- Platform: Web / Chrome
- Live demo: https://invoice-ai-frontend-seven.vercel.app
- Source: https://github.com/Abdussomad-Admin/Invoice-AI-Frontend
- Standalone backend source: https://github.com/Abdussomad-Admin/InvoiceAIBackend
- License: Apache-2.0
- Demo video: **Add public YouTube link after recording (maximum 3 minutes; English narration or subtitles).**

## Three-minute demo recording outline

Prepare a fictional workspace with sample invoices and bills. Do not show real customer, payment, or account information. Download Chrome's local model before recording the local and offline segments so the video does not spend time waiting for setup.

1. **0:00–0:20 — Introduce the problem and app.** Show the real deployed Invoice AI interface and briefly state that it helps small businesses keep invoices, payments, and supplier costs together.
2. **0:20–0:55 — Show local-first inference.** Ask a general question such as “How can I politely remind a customer about a late invoice?” Show the answer and its **Answered on device** label. Briefly point out that it did not use the business records.
3. **0:55–1:30 — Show a workspace question.** Ask “Which invoices are overdue?” Show the cloud answer and record sources, explaining that the API checks the signed-in user's access before returning records.
4. **1:30–2:00 — Show offline use.** With the local model already prepared, keep the assistant page open, disconnect the network, and use **On-device** for a general question. Show the local answer. Reconnect afterward.
5. **2:00–2:30 — Show cloud fallback.** In a fresh Chrome desktop profile where the local model is not yet available, send a general question while online. Show the **Cloud fallback** label and notice. Only include the segment if the deployed app confirms the fallback path in its UI.
6. **2:30–2:50 — Explain boundaries.** State that workspace records use permission-checked cloud tools, while the on-device assistant cannot access them. Avoid claiming that every device supports on-device AI.
7. **2:50–3:00 — Close.** State the product's intended audience and show the project name and live URL.

## Before submitting

- Confirm the deployed site is accessible to judges and that account creation or test credentials let them use it free of charge.
- Test on desktop Chrome 139+ with the local Prompt API model available. If the model is unavailable, the normal **Send** path should demonstrate cloud fallback for a general question.
- Verify the cloud-record path and local path on the deployed app, not just in a local build.
- Upload a real screen recording to YouTube, make it public, keep it under three minutes, and add English narration or subtitles.
- Replace no wording with unverified impact statistics; label any sample business data as fictional.
