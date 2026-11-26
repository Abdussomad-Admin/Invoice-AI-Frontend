const API_BASE_URL = import.meta.env.DEV ? "" : (import.meta.env.VITE_SERVER_API_BASE_URL || "https://invoiceaibackend-yk9n.onrender.com").replace(/\/$/, "");
const GENERAL_ERROR = "We couldn’t complete that action. Please try again. If it keeps happening, contact support.";

function humanizeField(value = "") {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/^./, letter => letter.toUpperCase());
}

function responseErrorMessage(result) {
  if (result && typeof result === "object" && result.errors && typeof result.errors === "object") {
    const first = Object.entries(result.errors)[0];
    if (first) {
      const [field, value] = first;
      const detail = Array.isArray(value) ? value[0] : value;
      if (detail && !/^one or more validation errors occurred\.?$/i.test(String(detail))) {
        const length = String(detail).match(/maximum length of (\d+)/i);
        if (length) return `${humanizeField(field)} must be no more than ${length[1]} characters${field.toLowerCase() === "countrycode" ? ". For example, use NG for Nigeria." : "."}`;
        if (/required/i.test(String(detail))) return `${humanizeField(field)} is required.`;
        return `${humanizeField(field)}: ${detail}`;
      }
    }
  }
  return typeof result === "string" ? result : result?.detail || result?.message || result?.error || result?.title || "";
}

export function friendlyErrorMessage(error, status, path = "") {
  const raw = typeof error === "string" ? error : error?.message;
  const message = String(raw || "").trim();
  const lower = message.toLowerCase();

  if (!message) return status === 400 ? "Please check the information and try again." : GENERAL_ERROR;
  if (/cannot read propert|cannot set propert|cannot access .* before initialization|object reference not set|nullreferenceexception|(?:reference|type|syntax)error\b|is not defined|not a function|stack trace| at [\w.$]+\s*\(|npgsql|sql(ex|state)|objectdisposedexception|invalidoperationexception/.test(lower)) return GENERAL_ERROR;
  if (/failed to fetch|networkerror|load failed|cors policy|can't connect|could not connect|network request failed/.test(lower)) return "We couldn’t connect to Invoice AI. Check your internet connection and try again.";
  if (/ai features are not enabled|ai .*not enabled on this server/.test(lower)) return "Automatic bill reading isn’t available right now. You can still enter the bill details yourself, or try again later.";
  if (/email.{0,30}not verified|verify your email/.test(lower)) return "Your email is not verified yet. We sent a fresh verification link. Open it to continue to your dashboard.";
  if (/invalid email or password|invalid credentials|email or password/.test(lower)) return "That email and password combination doesn’t match. Check your details and try again.";
  if (/session has expired|refresh token/.test(lower)) return "Your session has expired. Sign in again to continue.";
  if (/payment provider did not return|checkout link/.test(lower)) return "We couldn’t open secure payment. Please try again in a moment.";
  if (/business is still completing payment account verification|online payments are not ready for this business/.test(lower)) return "Online payments aren’t ready for this business yet. Check the Paystack account setup in Invoice AI, or arrange another payment method.";
  if (/needs to add an email address for this customer/.test(lower)) return "Add an email address to this customer’s record before accepting online payment.";
  if (/payment is already being prepared/.test(lower)) return "Your secure payment link is still being prepared. Wait a moment, then try again.";
  if (/json value could not be converted|cannot deserialize|deserialization|invalid request data/.test(lower)) return "Some details are in the wrong format. Check the form fields and try again.";
  if (/request failed|unexpected error|internal server error|something went wrong/.test(lower)) return GENERAL_ERROR;
  if (/duplicate key|unique constraint|already exists/.test(lower)) return "A record with those details already exists. Check the information and try again.";
  const fieldLength = message.match(/^([A-Za-z][A-Za-z0-9]*) must be at most (\d+) characters?\.?$/i);
  if (fieldLength) return `${humanizeField(fieldLength[1])} must be no more than ${fieldLength[2]} characters${fieldLength[1].toLowerCase() === "countrycode" ? ". For example, use NG for Nigeria." : "."}`;
  if (/^one or more validation errors occurred\.?$/i.test(message)) return "Some details need checking. Review the fields and try again.";

  if (status === 401) {
    if (path.includes("/auth/login")) return "That email and password combination doesn’t match. Check your details and try again.";
    if (path.includes("/public/")) return "We couldn’t verify this payment link. Open the link from the invoice or contact the business.";
    return "Your session has expired. Sign in again to continue.";
  }
  if (status === 403) return "You don’t have permission to do that. Ask your workspace owner for access.";
  if (status === 404) return path.includes("/public/")
    ? "We couldn’t find this invoice payment link. Ask the business to send you a new link."
    : "We couldn’t find that item. Refresh the page and check that it still exists.";
  if (status === 409) return "This change conflicts with an existing record. Refresh the page, check the details, and try again.";
  if (status === 413) return "That file is too large. Choose a smaller file and try again.";
  if (status === 429) return "You’re doing that a little too quickly. Wait a moment, then try again.";
  if (status >= 500) return "Invoice AI is having a temporary problem. Please try again shortly.";
  if (/<(!doctype|html)|\b(exception|stack trace|inner exception|server error)\b/i.test(message)) return GENERAL_ERROR;
  return message;
}

async function request(url, options) {
  try {
    return await fetch(url, options);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("Invoice AI’s server didn’t respond. Your internet may still be working; please try again shortly.", { cause: error });
    }
    throw error;
  }
}

export function getToken() { return sessionStorage.getItem("invoice-ai-token"); }
export function saveSession(result) {
  sessionStorage.setItem("invoice-ai-token", result.token);
  sessionStorage.setItem("invoice-ai-refresh", result.refreshToken);
  if (result.organizationId) sessionStorage.setItem("invoice-ai-organization", result.organizationId);
}
export function clearSession() {
  sessionStorage.removeItem("invoice-ai-token");
  sessionStorage.removeItem("invoice-ai-refresh");
  sessionStorage.removeItem("invoice-ai-organization");
}
let refreshInFlight = null;

async function refreshSession() {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const refreshToken = sessionStorage.getItem("invoice-ai-refresh");
      if (!refreshToken) throw new Error("Your session has expired. Please log in again.");
      const organizationId = sessionStorage.getItem("invoice-ai-organization");
      const response = await request(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken, organizationId: organizationId || null })
      });
      const type = response.headers.get("content-type") || "";
      const result = type.includes("json") ? await response.json() : await response.text();
      if (!response.ok) {
        throw new Error(friendlyErrorMessage(responseErrorMessage(result), response.status, "/api/auth/refresh"));
      }
      saveSession(result);
      return result.token;
    })().finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

async function authenticatedRequest(path, options) {
  const url = `${API_BASE_URL}${path}`;
  const send = token => {
    const headers = new Headers(options.headers || {});
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return request(url, { ...options, headers });
  };
  const originalToken = getToken();
  let response = await send(originalToken);
  if (response.status !== 401 || !originalToken || path.startsWith("/api/auth/")) return response;

  try {
    // Another request may already have refreshed the shared session.
    if (getToken() === originalToken) await refreshSession();
    response = await send(getToken());
    if (response.status === 401) {
      clearSession();
      window.dispatchEvent(new Event("invoice-ai-session-expired"));
    }
    return response;
  } catch (error) {
    clearSession();
    window.dispatchEvent(new Event("invoice-ai-session-expired"));
    throw new Error("Your session has expired. Please log in again.", { cause: error });
  }
}

function prepareOptions(options) {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData) && typeof options.body !== "string") {
    headers.set("Content-Type", "application/json");
    return { ...options, headers, body: JSON.stringify(options.body) };
  }
  return { ...options, headers };
}

export async function api(path, options = {}) {
  const response = await authenticatedRequest(path, prepareOptions(options));
  if (response.status === 204) return null;
  const type = response.headers.get("content-type") || "";
  const result = type.includes("json") ? await response.json() : await response.text();
  if (!response.ok) {
    throw new Error(friendlyErrorMessage(responseErrorMessage(result), response.status, path));
  }
  return result;
}
export async function apiBlob(path) {
  const response = await authenticatedRequest(path, {});
  if (!response.ok) {
    const message = await response.text();
    throw new Error(friendlyErrorMessage(message || "We couldn’t download that file. Please try again.", response.status, path));
  }
  return response.blob();
}
