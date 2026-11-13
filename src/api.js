const API_BASE_URL = import.meta.env.DEV ? "" : (import.meta.env.VITE_SERVER_API_BASE_URL || "https://invoiceaibackend-yk9n.onrender.com").replace(/\/$/, "");
async function request(url, options) {
  try {
    return await fetch(url, options);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("Can't connect to the hosted Invoice AI backend. Check your internet connection. If the API responds but the browser blocks the request, its CORS settings need the frontend's origin.", { cause: error });
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
        const message = typeof result === "string" ? result : result.detail || result.title || result.message || "Your session has expired. Please log in again.";
        throw new Error(message);
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
    const message = typeof result === "string" ? result : result.detail || result.title || result.message || "Request failed.";
    throw new Error(message);
  }
  return result;
}
export async function apiBlob(path) {
  const response = await authenticatedRequest(path, {});
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Download failed.");
  }
  return response.blob();
}
