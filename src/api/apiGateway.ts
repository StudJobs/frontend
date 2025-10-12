import axios from "axios";

const API_GATEWAY_URL = "http://localhost:5000/api"; // адрес backend сервера, нужно заменить!!!!

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  url: string;
  data?: any;
  params?: any;
  headers?: Record<string, string>;
}

/*Фронт общается с бэком*/
export async function apiGateway<T = any>(options: ApiRequestOptions): Promise<T> {
  const { method = "GET", url, data, params, headers } = options;

  try {
    const response = await axios({
      baseURL: API_GATEWAY_URL,
      method,
      url,
      data,
      params,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      withCredentials: true,
    });

    return response.data;
  } catch (error: any) {
    console.error("API Gateway error:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
}
