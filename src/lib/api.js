export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

export const apiUrl = (path) => `${API_BASE_URL}${path}`;

const getFallbackApiBaseUrl = () => {
  if (!API_BASE_URL.startsWith("http://localhost:")) {
    return null;
  }

  return API_BASE_URL.replace("http://localhost:", "http://127.0.0.1:");
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
