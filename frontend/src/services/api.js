// src/services/api.js
const API_BASE_URL = "http://localhost:5000";

let authToken = null;

export const setAuthToken = (token) => {
  authToken = token;
};

export const clearAuthToken = () => {
  authToken = null;
};

const request = async (endpoint, method = "GET", data = null, headers = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;

  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "*/*",
      ...(authToken && { Authorization: `Bearer ${authToken}` }),
      ...headers,
    },
  };

  if (data && ["POST", "PUT", "PATCH"].includes(method)) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const responseData = await response.json();

    if (!response.ok) {
      throw {
        status: response.status,
        message: responseData.message || response.statusText,
        data: responseData,
      };
    }

    return responseData;
  } catch (error) {
    if (error.status) {
      throw error;
    }
    throw {
      status: 500,
      message: "Network Error - Failed to connect to server",
      data: null,
    };
  }
};

export const api = {
  get: (endpoint, headers = {}) => request(endpoint, "GET", null, headers),
  post: (endpoint, data, headers = {}) =>
    request(endpoint, "POST", data, headers),
  put: (endpoint, data, headers = {}) =>
    request(endpoint, "PUT", data, headers),
  patch: (endpoint, data, headers = {}) =>
    request(endpoint, "PATCH", data, headers),
  delete: (endpoint, headers = {}) =>
    request(endpoint, "DELETE", null, headers),
};
