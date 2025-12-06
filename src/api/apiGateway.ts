import axios from "axios";

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  url: string;
  data?: any;
  params?: any;
  headers?: Record<string, string>;
}

const API_GATEWAY_URL = import.meta.env.VITE_API_URL || "/api/v1";

export async function apiGateway<T = any>(
  options: ApiRequestOptions
): Promise<T> {
  const { method = "GET", url, data, params, headers } = options;

  const normalizedUrl = url.startsWith("/") ? url : `/${url}`;

  try {
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem("token")
        : null;

    const response = await axios.request<T>({
      method,
      url: `${API_GATEWAY_URL}${normalizedUrl}`,
      data,
      params,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      withCredentials: true,
    });

    return response.data as T;
  } catch (error: any) {
    const payload = error?.response?.data || error?.message || error;
    console.error("API Gateway error:", payload);
    throw payload;
  }
}
