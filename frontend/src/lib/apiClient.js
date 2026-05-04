import axios from "axios";

const envBackendUrl = (process.env.REACT_APP_BACKEND_URL || "").trim().replace(/\/+$/, "");
const browserOrigin = typeof window !== "undefined" ? window.location.origin : "";

// If REACT_APP_BACKEND_URL is missing in a deployed build, use same-origin API.
export const BACKEND_URL = envBackendUrl || browserOrigin;
export const API = BACKEND_URL ? `${BACKEND_URL}/api` : "/api";

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

export function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}
