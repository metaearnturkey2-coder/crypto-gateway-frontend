export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }

  if (
    typeof window !== "undefined" &&
    window.location?.hostname &&
    !LOCAL_HOSTNAMES.has(window.location.hostname)
  ) {
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }

  return API_BASE_URL;
};

export const apiUrl = (path) => `${getApiBaseUrl()}${path}`;

const getFallbackApiBaseUrl = () => {
  const apiBaseUrl = getApiBaseUrl();

  if (!apiBaseUrl.startsWith("http://localhost:")) {
    return null;
  }

  return apiBaseUrl.replace("http://localhost:", "http://127.0.0.1:");
};

const NETWORK_ERROR_MESSAGE = "Network error. Please check your connection and try again.";

export const fetchApi = async (path, options = {}) => {
  try {
    return await fetch(apiUrl(path), options);
  } catch (error) {
    const fallbackBaseUrl = getFallbackApiBaseUrl();

    if (!fallbackBaseUrl) {
      throw error;
    }

    return fetch(`${fallbackBaseUrl}${path}`, options);
  }
};

export const clearMerchantSession = () => {
  localStorage.removeItem("token");
};

export const getMerchantToken = () => localStorage.getItem("token") || "";

export const redirectToLogin = () => {
  clearMerchantSession();
  window.location.href = "/login";
};

export const parseApiJson = async (response) => {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (_error) {
    return {
      message: text.replace(/\s+/g, " ").slice(0, 240),
    };
  }
};

export const apiErrorResult = ({
  message = "Request failed. Please try again.",
  response = null,
  status = 0,
} = {}) => ({
  body: { message },
  ok: false,
  response,
  status,
});

export const apiResponseResult = async (response) => ({
  body: await parseApiJson(response),
  ok: response.ok,
  response,
  status: response.status,
});

export const merchantFetch = async (path, options = {}) => {
  const token = getMerchantToken();

  if (!token) {
    redirectToLogin();
    return apiErrorResult({
      message: "Authentication required",
      status: 401,
    });
  }

  try {
    const response = await fetchApi(path, {
      ...options,
      cache: options.cache || "no-store",
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
    const result = await apiResponseResult(response);

    if (response.status === 401) {
      redirectToLogin();
    }

    return result;
  } catch (_error) {
    return apiErrorResult({
      message: NETWORK_ERROR_MESSAGE,
    });
  }
};

export const clearAdminSession = () => {
  localStorage.removeItem("adminAccessToken");
  localStorage.removeItem("adminToken");
};

export const getAdminAccessToken = () => localStorage.getItem("adminAccessToken") || "";

export const adminFetch = async (path, options = {}) => {
  const { accessToken, ...fetchOptions } = options;
  const token = accessToken || getAdminAccessToken();

  try {
    const response = await fetchApi(path, {
      ...fetchOptions,
      credentials: "include",
      cache: fetchOptions.cache || "no-store",
      headers: {
        ...(fetchOptions.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const result = await apiResponseResult(response);

    if (response.status === 401) {
      clearAdminSession();
    }

    return result;
  } catch (_error) {
    return apiErrorResult({
      message: NETWORK_ERROR_MESSAGE,
    });
  }
};
