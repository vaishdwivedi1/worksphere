// src/services/auth.js
import { api } from "./api";
import APIPATHS from "../utils/APIPATHS";

// The canonical key used by api.js and Login.jsx.
const TOKEN_KEY = "authToken";
// Legacy key that older code paths may have written.
const LEGACY_TOKEN_KEY = "token";

const readJSON = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}") || {};
  } catch {
    return {};
  }
};

export const getStoredSession = () => {
  const user = readJSON("user");
  const member = readJSON("member");
  const org = readJSON("org");

  // Support both the canonical key and the legacy one.
  const token =
    localStorage.getItem(TOKEN_KEY) ||
    localStorage.getItem(LEGACY_TOKEN_KEY) ||
    null;

  return {
    user,
    member,
    org,
    token,
    userId: user?.id || null,
    memberId: member?.id || member?.member_id || null,
    organizationId: org?.id || org?.organization_id || null,
  };
};

export const saveSession = (data) => {
  if (!data) return;
  const { user, member, org, token } = data;

  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    // Keep the legacy key in sync too, so anything still reading "token" works.
    localStorage.setItem(LEGACY_TOKEN_KEY, token);
  }
  if (user) localStorage.setItem("user", JSON.stringify(user));
  // FIX: store the `member` object (not `user`).
  if (member) localStorage.setItem("member", JSON.stringify(member));
  if (org) localStorage.setItem("org", JSON.stringify(org));
};

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem("user");
  localStorage.removeItem("member");
  localStorage.removeItem("org");
};

export const refreshSession = async () => {
  try {
    const res = await api.get(APIPATHS.me);
    if (res?.success && res.data) {
      saveSession(res.data);
      return res.data;
    }
    return null;
  } catch {
    return null;
  }
};
