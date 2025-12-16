import React from "react";
import { Navigate } from "react-router-dom";

export type RoleType = "ROLE_STUDENT" | "ROLE_EMPLOYER";

interface PrivateRouteProps {
  children: React.ReactNode;
  allowedRoles?: RoleType[];
}

const normalizeRole = (v: string) => v.replace(/^"+|"+$/g, "").trim();

const readRoleFromStorage = (): RoleType | null => {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem("role");
  if (!raw) return null;

  let role = normalizeRole(raw);

  if (role.startsWith("[") && role.endsWith("]")) {
    try {
      const arr = JSON.parse(role);
      if (Array.isArray(arr) && arr.length) {
        role = normalizeRole(String(arr[0] ?? ""));
      }
    } catch {
    }
  }

  if (role === "ROLE_STUDENT" || role === "ROLE_EMPLOYER") return role;
  return null;
};

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, allowedRoles }) => {
  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("token")
      : null;

  const userRole = readRoleFromStorage();

  if (!token) {
    return <Navigate to="/auth" replace />;
  }

  if (allowedRoles && (!userRole || !allowedRoles.includes(userRole))) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
