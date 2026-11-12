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
export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData) && typeof options.body !== "string") {
    headers.set("Content-Type", "application/json");
    options = { ...options, body: JSON.stringify(options.body) };
  }
  const response = await request(`${API_BASE_URL}${path}`, { ...options, headers });
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
  const headers = new Headers();
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await request(`${API_BASE_URL}${path}`, { headers });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Download failed.");
  }
  return response.blob();
}
