import React from "react";
import { Navigate, useLocation } from "react-router-dom";

export type RoleType =
  | "ROLE_STUDENT"
  | "ROLE_EMPLOYER"
  | "ROLE_COMPANY_OWNER"
  | "ROLE_EXPERT";

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
    role === "ROLE_COMPANY_OWNER" ||
    role === "ROLE_EXPERT"
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
    // Владельцу компании доступны: профиль компании, HR-дашборд, микрозадачи,
    // листинг вакансий/компаний (для контекста), отклики, экспертная очередь
    // (если внутри компании есть встроенные верификаторы) недоступна.
    const ok =
      p === "/" ||
      p === "/company-profile" ||
      p === "/company-profile/edit" ||
      p.startsWith("/company-profile/") ||
      p === "/hr" ||
      p === "/hr/tasks" ||
      p === "/hr/applications" ||
      p === "/vacancies" ||
      p === "/companies" ||
      p === "/users" ||
      p === "/tasks" ||
      p.startsWith("/u/");

    if (!ok) {
      return <Navigate to="/hr" replace />;
    }
  }

  if (userRole === "ROLE_EXPERT") {
    const p = location.pathname;
    const ok =
      p === "/expert" ||
      p.startsWith("/expert/") ||
      p === "/expert-profile" ||
      p.startsWith("/expert-profile/") ||
      p === "/messages" ||
      p.startsWith("/messages/") ||
      p.startsWith("/u/"); // публичные профили студентов эксперту тоже нужны
    if (!ok) {
      return <Navigate to="/expert" replace />;
    }
  }

  if (allowedRoles && (!userRole || !allowedRoles.includes(userRole))) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
