import { firebaseConfigured, getFirebaseRuntime } from "./firebaseRuntime";

let modelPromise;
let hybridModelPromise;
let deviceReadyPromise;
let hybridDeviceReadyPromise;

const HYBRID_CLOUD_MODEL = "gemini-3.8-flash";

const onDeviceOptions = {
  expectedInputs: [{ type: "text", languages: ["en"] }],
  expectedOutputs: [{ type: "text", languages: ["en"] }]
};

function isTemporaryAiServiceFailure(error) {
  return /failed to fetch|network|offline|timeout|timed out|err_network|\b(429|500|502|503|504)\b|resource exhausted|high demand|overload|temporarily unavailable/i
    .test(`${error?.message || ""} ${error?.code || ""}`);
}

export async function checkOnDeviceAvailability() {
  const languageModel = globalThis.LanguageModel;
  if (typeof languageModel?.availability !== "function") return "unsupported";
  try {
    return await languageModel.availability(onDeviceOptions);
  } catch {
    return "unknown";
  }
}

export async function preloadOnDeviceSdk() {
  await getFirebaseRuntime();
}

export function isWorkspaceDataQuestion(question) {
  const text = String(question || "").toLowerCase();
  const personalMetric = /\b(?:how much|how many|what did i|what have i|what was my)\b.*\b(?:receive|earn|pay|spend|make|owe|paid|cash|money|invoice|bill)\b/.test(text);
  if (personalMetric) return true;
  const record = /\b(?:invoices?|payments?|clients?|customers?|suppliers?|bills?|revenue|income|expenses?|profit|cash flow|balances?|bank statement|receivables?|payables?)\b/.test(text);
  if (!record) return false;
  const personal = /\b(?:my|our|workspace|business records?|this business|for this account)\b/.test(text);
  const lookup = /\b(?:which|show|list|find|check|review|summari[sz]e|compare|total|count|how many|how much|overdue|outstanding|unpaid|pending|received|earned|spent|paid|owed|due)\b/.test(text);
  const period = /\b(?:this|last|current|previous)\s+(?:month|week|quarter|year|period)\b/.test(text);
  const educational = /\b(?:what (?:is|are)|explain|define|how (?:do|does) .{0,50} work|how to|how can i|how do i)\b/.test(text);
  return personal || lookup || period || !educational;
}

async function getHybridModel() {
  if (!hybridModelPromise) {
    hybridModelPromise = getFirebaseRuntime().then(runtime => ({
      runtime,
      model: runtime.getGenerativeModel(runtime.ai, {
        mode: runtime.InferenceMode.PREFER_ON_DEVICE,
        onDeviceParams: { createOptions: onDeviceOptions },
        inCloudParams: {
          model: HYBRID_CLOUD_MODEL,
          generationConfig: { temperature: 0.3, maxOutputTokens: 700 }
        }
      })
    })).catch(error => { hybridModelPromise = undefined; throw error; });
  }
  return hybridModelPromise;
}

export async function askFirebaseHybrid(question, onText, onProgress) {
  const text = String(question || "").trim();
  if (!text) throw new Error("Type a question first.");
  if (!window.isSecureContext) throw new Error("AI needs a secure connection. Open Invoice AI over HTTPS or localhost.");

  const availability = await checkOnDeviceAvailability();
  if (!navigator.onLine && availability !== "available") {
    throw new Error("You're offline and Chrome's local AI model isn't ready yet. Reconnect once to prepare it, then try again offline.");
  }

  const { model } = await getHybridModel();
  if (!hybridDeviceReadyPromise) {
    try {
      hybridDeviceReadyPromise = model.initializeDeviceModel(progress => onProgress?.(Math.round(progress * 100)))
        .catch(error => { hybridDeviceReadyPromise = undefined; return null; });
    } catch {
      hybridDeviceReadyPromise = undefined;
    }
  }

  const prompt = [
    "You are Invoice AI, a private hybrid assistant for small-business finance and bookkeeping education.",
    "Answer general questions clearly and concisely. You do not have access to this user's invoices, customers, payments, bank accounts, or saved financial records. Never invent personal business figures or claim you checked records.",
    "When a question requires this user's saved business data, say to ask Invoice AI to check workspace records instead. Do not promise loans, credit approval, or returns, and do not present general information as regulated financial advice.",
    `User request: ${text}`
  ].join("\n\n");

  let streamedText = "";
  try {
    const result = await model.generateContentStream(prompt);
    for await (const chunk of result.stream) {
      const part = chunk.candidates?.flatMap(candidate => candidate.content?.parts || []).map(item => item.text || "").join("") || "";
      if (part) { streamedText += part; onText?.(streamedText); }
    }
    const response = await result.response;
    const answer = response?.text?.()?.trim() || streamedText.trim();
    if (!answer) throw new Error("The assistant did not return an answer. Please try again.");
    const inferenceSource = String(response?.inferenceSource || "").toUpperCase();
    const usedOnDevice = inferenceSource.includes("ON_DEVICE");
    return {
      answer,
      mode: usedOnDevice ? "on-device" : "cloud-fallback",
      inferenceSource,
      notice: usedOnDevice
        ? "Answered on this device with Chrome’s local model. This general answer did not use your saved workspace records."
        : "Chrome’s local model wasn’t ready, so Firebase AI Logic answered with cloud Gemini. This general question was sent online; workspace records were not included."
    };
  } catch (error) {
    // A ready local model can still answer general questions if Firebase's cloud
    // endpoint has a temporary connection or availability issue.
    if (availability !== "available" || streamedText || !isTemporaryAiServiceFailure(error)) throw error;
    onText?.("");
    try {
      const answer = await askOnDevice(text, onProgress);
      return {
        answer,
        mode: "on-device",
        inferenceSource: "ON_DEVICE",
        notice: "The online AI service was unavailable, so this general answer was completed on your device. It did not use workspace records."
      };
    } catch {
      throw error;
    }
  }
}

async function getOnDeviceModel() {
  if (!modelPromise) {
    const runtime = await getFirebaseRuntime();
    modelPromise = runtime.getGenerativeModel(runtime.ai, {
      mode: runtime.InferenceMode.ONLY_ON_DEVICE,
      onDeviceParams: { createOptions: onDeviceOptions }
    });
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
  const availability = await checkOnDeviceAvailability();
  if (availability === "unsupported") throw new Error("On-device AI is not available in this browser. Use desktop Chrome 139 or newer and make sure Chrome's on-device model is enabled.");
  if (availability === "unavailable") throw new Error("Chrome reports that the on-device model is unavailable on this device. Check Chrome's model status, free storage, and device requirements.");
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
