export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

export const apiUrl = (path) => `${API_BASE_URL}${path}`;

const getFallbackApiBaseUrl = () => {
  if (!API_BASE_URL.startsWith("http://localhost:")) {
    return null;
  }

  return API_BASE_URL.replace("http://localhost:", "http://127.0.0.1:");
};

export const fetchApi = async (path, options) => {
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
