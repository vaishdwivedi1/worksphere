import { api } from "./api";
import APIPATHS from "../utils/APIPATHS";

const readJSON = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}") || {};
  } catch {
    return {};
  }
};

export const getStoredSession = () => {
  const user = readJSON("user");
  const member = readJSON("user");
  const org = readJSON("org");
  return {
    user,
    member,
    org,
    userId: user?.id || null,
    memberId: member?.id || member?.member_id || null,
    organizationId: org?.id || org?.organization_id || null,
  };
};

export const saveSession = (data) => {
  if (!data) return;
  const { user, member, org, token } = data;
  if (token) localStorage.setItem("token", token);
  if (user) localStorage.setItem("user", JSON.stringify(user));
  if (member) localStorage.setItem("member", JSON.stringify(user));
  if (org) localStorage.setItem("org", JSON.stringify(org));
};

export const clearSession = () => {
  localStorage.removeItem("token");
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
