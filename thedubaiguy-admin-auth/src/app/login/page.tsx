import LoginForm from "../../components/LoginForm";

export default function LoginPage({ searchParams }: { searchParams?: { next?: string } }) {
  const next = searchParams?.next || "/admin";
  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "#f6efe2" }}>
      <div style={{ background: "#fff", padding: "40px 30px", border: "1px solid #e7dcc6", borderRadius: 8, width: "100%", maxWidth: 420 }}>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
