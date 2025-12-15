import React from "react";
import { Navigate } from "react-router-dom";

export type RoleType =
  | "ROLE_STUDENT"
  | "ROLE_EMPLOYER";

interface PrivateRouteProps {
  children: React.ReactNode;
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

  if (!token) {
    return <Navigate to="/auth" replace />;
  }

  if (allowedRoles && (!userRole || !allowedRoles.includes(userRole))) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
