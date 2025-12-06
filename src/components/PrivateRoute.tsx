import React from "react";
import { Navigate } from "react-router-dom";

export type RoleType =
  | "ROLE_STUDENT"
  | "ROLE_DEVELOPER"
  | "ROLE_HR"
  | "ROLE_COMPANY";

interface PrivateRouteProps {
  children: React.ReactNode;
  /**
   * Роли, которым разрешён доступ к этому маршруту.
   * Если не передано — пустим любого залогиненного.
   */
  allowedRoles?: RoleType[];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("token")
      : null;

  const userRole =
    typeof window !== "undefined"
      ? (window.localStorage.getItem("role") as RoleType | null)
      : null;

  // Не авторизован — уходим на авторизацию
  if (!token) {
    return <Navigate to="/auth" replace />;
  }

  // Авторизован, но роль не подходит под маршрут
  if (allowedRoles && (!userRole || !allowedRoles.includes(userRole))) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
