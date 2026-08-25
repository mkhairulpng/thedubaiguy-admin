"use client";
import React from "react";

export default function QrApprove({ id, token }: { id: string; token: string }) {
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [state, setState] = React.useState<"ready" | "busy" | "done">("ready");
  const [error, setError] = React.useState("");

  async function approve(e: React.FormEvent) {
    e.preventDefault(); setState("busy"); setError("");
    try {
      const response = await fetch("/api/auth/qr/approve", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, token, identifier, password }),
      });
      const data: any = await response.json();
      if (!response.ok) throw new Error(data.error || "Approval failed");
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed"); setState("ready");
    }
  }

  if (state === "done") return <div style={{ textAlign: "center" }}><div style={{ fontSize: 36, color: "#a67c35" }}>✓</div><h1 style={heading}>LOGIN APPROVED</h1><p style={copy}>Your desktop will sign in automatically. You may close this page.</p></div>;

  return <form onSubmit={approve} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <div style={{ textAlign: "center", marginBottom: 8 }}><div style={{ color: "#a67c35", letterSpacing: 2, fontSize: 11 }}>THEDUBAIGUY ADMIN</div><h1 style={heading}>APPROVE DESKTOP LOGIN</h1><p style={copy}>Enter the details for your active account.</p></div>
    <input type="text" autoComplete="username" placeholder="Username or email" value={identifier} onChange={e => setIdentifier(e.target.value)} style={input} required />
    <input type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={input} required />
    <button type="submit" disabled={state === "busy"} style={button}>{state === "busy" ? "APPROVING…" : "APPROVE LOGIN"}</button>
    {error && <div style={{ color: "#a2463d", textAlign: "center", fontSize: 13 }}>{error}</div>}
  </form>;
}

const heading: React.CSSProperties = { fontFamily: "Georgia, serif", fontWeight: 400, fontSize: 26, margin: "10px 0" };
const copy: React.CSSProperties = { color: "#776f65", fontSize: 13, lineHeight: 1.5 };
const input: React.CSSProperties = { padding: "13px 14px", border: "1px solid #d8cdbd", borderRadius: 5, fontSize: 16 };
const button: React.CSSProperties = { padding: "14px", background: "#18130f", color: "#d6b16c", border: 0, borderRadius: 5, letterSpacing: 1.2 };
