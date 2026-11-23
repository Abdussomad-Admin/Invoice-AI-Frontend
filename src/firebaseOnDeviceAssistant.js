import { firebaseConfigured, getFirebaseRuntime } from "./firebaseRuntime";

let modelPromise;
let deviceReadyPromise;

export async function preloadOnDeviceSdk() {
  await getFirebaseRuntime();
}

async function getOnDeviceModel() {
  if (!modelPromise) {
    const runtime = await getFirebaseRuntime();
    modelPromise = runtime.getGenerativeModel(runtime.ai, { mode: runtime.InferenceMode.ONLY_ON_DEVICE });
  }
  return modelPromise;
}

async function prepareOnDeviceModel(model, onProgress) {
  if (!deviceReadyPromise) {
    deviceReadyPromise = model.initializeDeviceModel(progress => onProgress?.(Math.round(progress * 100)))
      .catch(error => { deviceReadyPromise = undefined; throw error; });
  }
  await deviceReadyPromise;
}

export async function askOnDevice(question, onProgress) {
  const text = String(question || "").trim();
  if (text.length < 3) throw new Error("Type a question first.");
  if (text.length > 500) throw new Error("Keep on-device questions under 500 characters.");
  if (!window.isSecureContext) throw new Error("On-device AI needs a secure connection. Open Invoice AI over HTTPS or localhost.");
  if (!navigator.onLine && !deviceReadyPromise) {
    throw new Error("To use local help offline, open Invoice AI while connected and prepare the on-device model first. Then keep this page available when you go offline.");
  }

  const model = await getOnDeviceModel();
  await prepareOnDeviceModel(model, onProgress);
  const prompt = [
    "You are Invoice AI's private, on-device business helper.",
    "Answer general questions about bookkeeping, invoices, financial terms, and safe business practices in clear, concise language.",
    "You cannot access workspace records. Never claim that you checked invoices, payments, bank data, or current business figures.",
    "For personal financial figures, tell the user to use the online Ask Invoice AI assistant, which checks records they are authorized to access.",
    "Do not make loan approval promises or present general information as regulated financial advice.",
    `User request: ${text}`
  ].join("\n\n");
  const result = await model.generateContent(prompt);
  const answer = result?.response?.text?.()?.trim();
  if (!answer) throw new Error("The on-device model returned an empty answer. Please try rephrasing your question.");
  return answer;
}

export function firebaseOnDeviceConfigured() {
  return firebaseConfigured();
}
