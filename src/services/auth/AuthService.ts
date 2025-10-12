import { saveTokenToStorage, removeTokenFromStorage } from "./auth-helper";
import { IAuthResponce } from "./auth-service.interface";
import { apiGateway } from "@/api/apiGateway";

export const AuthService = {
  async login(email: string, password: string) {
    const response = await apiGateway<IAuthResponce>({
      method: "POST",
      url: "/auth/login",
      data: { email, password },
    });

    if (response.accessToken) await saveTokenToStorage(response.accessToken);
    return response;
  },

  async register(email: string, password: string, role: string, login: string) {
    const response = await apiGateway<IAuthResponce>({
      method: "POST",
      url: "/auth/register",
      data: { email, password, role, login },
    });

    if (response.accessToken) await saveTokenToStorage(response.accessToken);
    return response;
  },

  async logout() {
    await apiGateway({ method: "POST", url: "/auth/logout" });
    await removeTokenFromStorage();
  },
};
