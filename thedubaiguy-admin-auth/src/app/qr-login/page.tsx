import QrApprove from "../../components/QrApprove";

export default function QrLoginPage({ searchParams }: { searchParams?: { id?: string; token?: string } }) {
  const id = searchParams?.id || "";
  const token = searchParams?.token || "";
  return <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "#f6efe2" }}><div style={{ background: "#fffdf9", padding: "34px 26px", border: "1px solid #ddcfb7", borderRadius: 10, width: "100%", maxWidth: 420 }}>{id && token ? <QrApprove id={id} token={token} /> : <p style={{ textAlign: "center" }}>This QR login link is invalid.</p>}</div></main>;
}
