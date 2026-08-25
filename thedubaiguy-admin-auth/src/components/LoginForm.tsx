"use client";
import React from "react";
import QRCode from "qrcode";

type QrSession = { id: string; pollToken: string; approveUrl: string; expiresAt: number; image: string };

export default function LoginForm({ next = "/admin" }: { next?: string }) {
  const [mode, setMode] = React.useState<"password" | "qr">("password");
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [err, setErr] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [qr, setQr] = React.useState<QrSession | null>(null);
  const [seconds, setSeconds] = React.useState(0);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier, password }), credentials: "include" });
      const d: any = await r.json();
      if (r.ok) window.location.href = next;
      else setErr(d.error || "Login failed");
    } catch { setErr("Network error"); }
    setBusy(false);
  }

  const makeQr = React.useCallback(async () => {
    setErr(""); setBusy(true); setQr(null);
    try {
      const response = await fetch("/api/auth/qr/start", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ next }) });
      const data: any = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create QR code");
      const image = await QRCode.toDataURL(data.approveUrl, { width: 220, margin: 1, color: { dark: "#211912", light: "#fffdf9" } });
      setQr({ ...data, image });
    } catch (error) { setErr(error instanceof Error ? error.message : "Unable to create QR code"); }
    setBusy(false);
  }, [next]);

  React.useEffect(() => {
    if (!qr) return;
    const updateClock = () => setSeconds(Math.max(0, qr.expiresAt - Math.floor(Date.now() / 1000)));
    updateClock(); const timer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timer);
  }, [qr]);

  React.useEffect(() => {
    if (!qr || seconds <= 0) return;
    let cancelled = false;
    const poll = window.setInterval(async () => {
      try {
        const response = await fetch("/api/auth/qr/status", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: qr.id, pollToken: qr.pollToken }) });
        const data: any = await response.json();
        if (!cancelled && response.ok && data.status === "approved") window.location.href = data.next || next;
      } catch { /* retry until expiry */ }
    }, 1500);
    return () => { cancelled = true; window.clearInterval(poll); };
  }, [qr, seconds > 0, next]);

  function selectMode(value: "password" | "qr") {
    setMode(value); setErr("");
    if (value === "password") setQr(null);
    if (value === "qr" && !qr && !busy) void makeQr();
  }

  return <div style={{ maxWidth: 380, margin: "0 auto" }}>
    <div style={{ textAlign: "center", marginBottom: 22 }}><div style={{ color: "#a67c35", letterSpacing: 2.4, fontSize: 11 }}>ADMINISTRATOR ACCESS</div><h1 style={{ fontFamily: "Georgia, serif", fontWeight: 400, fontSize: 31, margin: "10px 0 6px" }}>Welcome back, Khail.</h1></div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", border: "1px solid #d8c7a8", borderRadius: 6, padding: 3, marginBottom: 20 }}><button type="button" onClick={() => selectMode("password")} style={tab(mode === "password")}>PASSWORD</button><button type="button" onClick={() => selectMode("qr")} style={tab(mode === "qr")}>QR CODE</button></div>
    {mode === "password" ? <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <input type="text" placeholder="Username or email" value={identifier} autoComplete="username" onChange={e => setIdentifier(e.target.value)} required style={input} />
      <input type="password" placeholder="Password" value={password} autoComplete="current-password" onChange={e => setPassword(e.target.value)} required style={input} />
      <button type="submit" disabled={busy} style={button}>{busy ? "SIGNING IN…" : "SIGN IN"}</button>
    </form> : <div style={{ textAlign: "center", minHeight: 330 }}>
      {qr && seconds > 0 ? <><div style={{ display: "inline-flex", padding: 12, background: "#fffdf9", border: "1px solid #d6b16c", borderRadius: 10 }}><img src={qr.image} alt="Scan to approve desktop login" width={220} height={220} /></div><p style={{ fontSize: 13, color: "#675e55", lineHeight: 1.5, margin: "14px auto 4px" }}>Scan using your iPhone camera, then approve your active account.</p><div style={{ fontSize: 11, letterSpacing: 1.2, color: "#a67c35" }}>EXPIRES IN {seconds} SECONDS</div></> : <><div style={{ padding: "72px 0 28px", color: "#8b8177" }}>{busy ? "GENERATING SECURE QR…" : "THIS QR CODE HAS EXPIRED"}</div>{!busy && <button type="button" onClick={makeQr} style={outlineButton}>REFRESH QR CODE</button>}</>}
    </div>}
    {err && <div style={{ color: "#a2463d", fontSize: 13, textAlign: "center", marginTop: 12 }}>{err}</div>}
  </div>;
}

const input: React.CSSProperties = { padding: "13px 14px", border: "1px solid #d8cdbd", borderRadius: 5, fontSize: 15 };
const button: React.CSSProperties = { padding: "14px", background: "#18130f", color: "#d6b16c", border: 0, borderRadius: 5, cursor: "pointer", letterSpacing: 1.2 };
const outlineButton: React.CSSProperties = { padding: "12px 18px", background: "transparent", color: "#9b742f", border: "1px solid #b9914d", borderRadius: 5, letterSpacing: 1.1 };
const tab = (active: boolean): React.CSSProperties => ({ padding: "10px 8px", background: active ? "#b88d48" : "transparent", color: active ? "#fff" : "#84662f", border: 0, borderRadius: 4, letterSpacing: 1, cursor: "pointer" });
