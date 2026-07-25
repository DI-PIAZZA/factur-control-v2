import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ count: suppliersCount }, { count: invoicesCount }, { count: relevesCount }] =
    await Promise.all([
      supabase.from("suppliers").select("id", { count: "exact", head: true }),
      supabase.from("invoices").select("id", { count: "exact", head: true }),
      supabase.from("releves").select("id", { count: "exact", head: true }),
    ]);

  const cards = [
    {
      href: "/factures",
      icon: "📄",
      title: "Factures",
      description: "Consultez l'historique de toutes vos factures contrôlées.",
      count: invoicesCount ?? 0,
      countLabel: "facture(s)",
      accent: "#E85A00",
      bg: "linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)",
      border: "#FDBA74",
      countColor: "#E85A00",
    },
    {
      href: "/fournisseurs",
      icon: "🏢",
      title: "Fournisseurs",
      description: "Gérez vos fournisseurs et leurs tarifs de référence.",
      count: suppliersCount ?? 0,
      countLabel: "fournisseur(s)",
      accent: "#1D4ED8",
      bg: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)",
      border: "#BFDBFE",
      countColor: "#1D4ED8",
    },
    {
      href: "/releves",
      icon: "📋",
      title: "Contrôle relevé",
      description: "Vérifiez qu'un relevé fournisseur correspond aux factures déjà enregistrées.",
      count: relevesCount ?? 0,
      countLabel: "relevé(s) analysé(s)",
      accent: "#DC2626",
      bg: "linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)",
      border: "#FECACA",
      countColor: "#DC2626",
    },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #1E40AF 0%, #1D4ED8 40%, #2563EB 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 24px",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>

      {/* Logo + titre */}
      <div style={{ textAlign: "center", marginBottom: "56px" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: "72px", height: "72px", background: "#E85A00",
          borderRadius: "20px", fontSize: "32px", marginBottom: "20px",
          boxShadow: "0 8px 24px rgba(232,90,0,0.4)",
        }}>
          FC
        </div>
        <h1 style={{
          fontSize: "42px", fontWeight: "900", color: "white",
          letterSpacing: "-0.5px", margin: "0 0 10px",
          textShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}>
          Contrôle Factures
        </h1>
        <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.7)", margin: 0 }}>
          Détectez les écarts entre vos tarifs négociés et vos factures réelles
        </p>
      </div>

      {/* 3 cartes */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "24px",
        width: "100%",
        maxWidth: "900px",
      }}>
        {cards.map((card) => (
          <a
            key={card.href}
            href={card.href}
            style={{ textDecoration: "none" }}
          >
            <div style={{
              background: card.bg,
              border: `2px solid ${card.border}`,
              borderRadius: "20px",
              padding: "32px 28px",
              cursor: "pointer",
              boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
              height: "100%",
              boxSizing: "border-box",
            }}>
              <div style={{ fontSize: "40px", marginBottom: "16px" }}>{card.icon}</div>
              <h2 style={{
                fontSize: "20px", fontWeight: "800", color: "#1F2937",
                margin: "0 0 10px",
              }}>
                {card.title}
              </h2>
              <p style={{
                fontSize: "14px", color: "#6B7280", margin: "0 0 24px",
                lineHeight: "1.5",
              }}>
                {card.description}
              </p>
              <div style={{
                display: "flex", alignItems: "baseline", gap: "6px",
                borderTop: `1px solid ${card.border}`, paddingTop: "16px",
              }}>
                <span style={{ fontSize: "32px", fontWeight: "900", color: card.countColor }}>
                  {card.count}
                </span>
                <span style={{ fontSize: "13px", color: "#9CA3AF", fontWeight: "600" }}>
                  {card.countLabel}
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Footer */}
      <div style={{ marginTop: "48px", textAlign: "center" }}>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", margin: 0 }}>
          Connecté en tant que {user.email}
        </p>
      </div>
    </div>
  );
}
