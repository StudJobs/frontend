import React from "react";
import { Navigate, useLocation } from "react-router-dom";

export type RoleType = "ROLE_STUDENT" | "ROLE_EMPLOYER" | "ROLE_COMPANY_OWNER";

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
      // ignore
    }
  }

  if (
    role === "ROLE_STUDENT" ||
    role === "ROLE_EMPLOYER" ||
    role === "ROLE_COMPANY_OWNER"
  ) {
    return role;
  }

  return null;
};

const PrivateRoute: React.FC<PrivateRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const location = useLocation();

  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("token")
      : null;

  const userRole = readRoleFromStorage();

  if (!token) {
    return <Navigate to="/auth" replace />;
  }

  if (userRole === "ROLE_COMPANY_OWNER") {
    const p = location.pathname;
    const ok =
      p === "/company-profile" ||
      p === "/company-profile/edit" ||
      p.startsWith("/company-profile/");

    if (!ok) {
      return <Navigate to="/company-profile" replace />;
    }
  }

  if (allowedRoles && (!userRole || !allowedRoles.includes(userRole))) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
