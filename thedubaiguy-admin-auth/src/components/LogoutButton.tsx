"use client";
import React from "react";
export default function LogoutButton() {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/login";
  }
  return <button onClick={logout} style={{ background: "none", border: "1px solid #d8cdbd", padding: "8px 14px", borderRadius: 4, cursor: "pointer" }}>Log out</button>;
}
