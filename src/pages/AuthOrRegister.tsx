import React from "react";
import { useSearchParams } from "react-router-dom";
import Auth from "./Auth";
import Register from "./Register";

export default function AuthOrRegister() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");

  return mode === "register" ? <Register /> : <Auth />;
}
