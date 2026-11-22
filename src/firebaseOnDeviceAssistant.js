let firebaseSdk;
let firebaseSdkPromise;
let modelPromise;
let deviceReadyPromise;

export function preloadOnDeviceSdk() {
  if (!firebaseSdkPromise) {
    firebaseSdkPromise = Promise.all([
      import("firebase/app"),
      import("firebase/app-check"),
      import("firebase/ai")
    ]).then(([app, appCheck, ai]) => {
      firebaseSdk = { ...app, ...appCheck, ...ai };
      return firebaseSdk;
    }).catch(error => {
      firebaseSdkPromise = undefined;
      throw error;
    });
  }
  return firebaseSdkPromise;
}

const firebaseConfig = () => ({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
});

function getFirebaseConfiguration() {
  const config = firebaseConfig();
  const missing = ["apiKey", "projectId", "appId"].filter(key => !config[key]);
  if (missing.length) {
    throw new Error("Firebase AI Logic is not configured yet. Add the Firebase web app settings in the deployment environment, then try again.");
  }
  if (!import.meta.env.DEV && !import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY) {
    throw new Error("On-device AI needs Firebase App Check enabled. Add the production App Check site key to the deployment environment.");
  }
  return config;
}

function getOnDeviceModel() {
  if (!firebaseSdk) throw new Error("On-device AI is still preparing. Wait a moment and try again.");
  if (!modelPromise) {
    const config = getFirebaseConfiguration();
    const { getApp, getApps, initializeApp, initializeAppCheck, ReCaptchaEnterpriseProvider, getAI, getGenerativeModel, GoogleAIBackend, InferenceMode } = firebaseSdk;
    const app = getApps().length ? getApp() : initializeApp(config);

    if (import.meta.env.DEV) {
      // Firebase prints a one-time debug token in the console; safelist it in App Check.
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      initializeAppCheck(app, { isTokenAutoRefreshEnabled: true });
    } else {
      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });
    }

    const ai = getAI(app, { backend: new GoogleAIBackend() });
    modelPromise = getGenerativeModel(ai, { mode: InferenceMode.ONLY_ON_DEVICE });
  }
  return modelPromise;
}

async function prepareOnDeviceModel(model, onProgress) {
  if (!deviceReadyPromise) {
    // Call immediately from the click handler to satisfy Chrome's user-activation requirement.
    deviceReadyPromise = model.initializeDeviceModel(progress => onProgress?.(Math.round(progress * 100)))
      .catch(error => {
        deviceReadyPromise = undefined;
        throw error;
      });
  }
  await deviceReadyPromise;
}

export async function askOnDevice(question, onProgress) {
  const text = String(question || "").trim();
  if (text.length < 3) throw new Error("Type a question first.");
  if (text.length > 500) throw new Error("Keep on-device questions under 500 characters.");
  if (!window.isSecureContext) {
    throw new Error("On-device AI needs a secure connection. Open Invoice AI over HTTPS or localhost.");
  }
  if (!navigator.onLine && !deviceReadyPromise) {
    throw new Error("To use local help offline, open Invoice AI while connected and prepare the on-device model first. Then keep this page available when you go offline.");
  }

  const model = getOnDeviceModel();
  await prepareOnDeviceModel(model, onProgress);
  const prompt = [
    "You are Invoice AI's private, on-device business helper.",
    "Answer general questions about bookkeeping, invoices, financial terms, and safe business practices in clear, concise language.",
    "You cannot access the user's Invoice AI workspace, invoices, payments, bank data, or current financial figures. Never claim that you checked those records.",
    "If asked to retrieve or calculate personal workspace figures, explain that the user should use the main Ask Invoice AI button, which securely checks their authorized workspace records.",
    "Do not make loan approval promises or present general information as regulated financial advice.",
    `User question: ${text}`
  ].join("\n\n");
  const result = await model.generateContent(prompt);
  const answer = result?.response?.text?.()?.trim();
  if (!answer) throw new Error("The on-device model returned an empty answer. Please try rephrasing your question.");
  return answer;
}

export function firebaseOnDeviceConfigured() {
  const hasFirebaseConfig = Boolean(import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID && import.meta.env.VITE_FIREBASE_APP_ID);
  return hasFirebaseConfig && (import.meta.env.DEV || Boolean(import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY));
}

