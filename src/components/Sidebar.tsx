"use client";

import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/dashboard", icon: "⊞", label: "Tableau de bord" },
  { href: "/fournisseurs", icon: "🏢", label: "Fournisseurs" },
  { href: "/factures", icon: "📄", label: "Factures" },
];

export default function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div
      style={{
        width: "220px",
        minHeight: "100vh",
        background: "#1E40AF",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        position: "sticky",
        top: 0,
        height: "100vh",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "20px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              background: "#E85A00",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "800",
              color: "white",
              fontSize: "14px",
              flexShrink: 0,
            }}
          >
            FC
          </div>
          <span
            style={{ color: "white", fontWeight: "700", fontSize: "15px" }}
          >
            Factur Control
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ padding: "12px 8px", flex: 1 }}>
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <a
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 12px",
                borderRadius: "8px",
                marginBottom: "2px",
                color: isActive ? "white" : "rgba(255,255,255,0.65)",
                background: isActive
                  ? "rgba(255,255,255,0.12)"
                  : "transparent",
                fontWeight: isActive ? "600" : "400",
                fontSize: "14px",
                textDecoration: "none",
                borderLeft: isActive
                  ? "3px solid #E85A00"
                  : "3px solid transparent",
              }}
            >
              <span style={{ fontSize: "16px" }}>{item.icon}</span>
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>

      {/* User / Déconnexion */}
      <div
        style={{
          padding: "16px",
          borderTop: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div
          style={{
            fontSize: "12px",
            color: "rgba(255,255,255,0.45)",
            marginBottom: "8px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {userEmail}
        </div>
        <button
          onClick={handleSignOut}
          style={{
            width: "100%",
            padding: "8px",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "6px",
            color: "rgba(255,255,255,0.7)",
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          Déconnexion
        </button>
      </div>
    </div>
  );
}
