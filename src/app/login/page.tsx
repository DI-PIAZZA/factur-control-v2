"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Panneau gauche — branding */}
      <div
        style={{
          flex: 1,
          background: "linear-gradient(135deg, #1E40AF 0%, #1D4ED8 60%, #2563EB 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px",
          color: "white",
        }}
      >
        {/* Logo */}
        <div style={{ marginBottom: "32px", textAlign: "center" }}>
          <div
            style={{
              width: "72px",
              height: "72px",
              background: "#E85A00",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              fontSize: "32px",
              fontWeight: "800",
              color: "white",
            }}
          >
            FC
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: "800", letterSpacing: "-0.5px" }}>
            Factur Control
          </h1>
          <p style={{ fontSize: "14px", opacity: 0.75, marginTop: "4px" }}>
            Contrôle de facturation fournisseurs
          </p>
        </div>

        {/* Avantages */}
        <div style={{ maxWidth: "320px", width: "100%" }}>
          {[
            { icon: "✓", text: "Détection automatique des écarts de prix" },
            { icon: "✓", text: "Extraction PDF par intelligence artificielle" },
            { icon: "✓", text: "Mail d'avoir prêt en un clic" },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "16px",
                background: "rgba(255,255,255,0.1)",
                borderRadius: "10px",
                padding: "12px 16px",
              }}
            >
              <span
                style={{
                  width: "24px",
                  height: "24px",
                  background: "#16A34A",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "white",
                }}
              >
                {item.icon}
              </span>
              <span style={{ fontSize: "14px", opacity: 0.9 }}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Panneau droit — formulaire */}
      <div
        style={{
          flex: 1,
          background: "#0F172A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px",
        }}
      >
        <div style={{ width: "100%", maxWidth: "360px" }}>
          <h2
            style={{
              fontSize: "24px",
              fontWeight: "700",
              color: "white",
              marginBottom: "8px",
            }}
          >
            Connexion
          </h2>
          <p style={{ fontSize: "14px", color: "#94A3B8", marginBottom: "32px" }}>
            Accédez à votre espace de contrôle
          </p>

          <form onSubmit={handleLogin}>
            {/* Email */}
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#CBD5E1",
                  marginBottom: "6px",
                }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.fr"
                required
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  background: "#1E293B",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  color: "white",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
            </div>

            {/* Mot de passe */}
            <div style={{ marginBottom: "24px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#CBD5E1",
                  marginBottom: "6px",
                }}
              >
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  background: "#1E293B",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  color: "white",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
            </div>

            {/* Erreur */}
            {error && (
              <div
                style={{
                  background: "#DC262620",
                  border: "1px solid #DC2626",
                  borderRadius: "8px",
                  padding: "12px",
                  color: "#FCA5A5",
                  fontSize: "13px",
                  marginBottom: "16px",
                }}
              >
                {error}
              </div>
            )}

            {/* Bouton */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "13px",
                background: loading ? "#B84500" : "#E85A00",
                border: "none",
                borderRadius: "8px",
                color: "white",
                fontSize: "15px",
                fontWeight: "700",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background 0.2s",
              }}
            >
              {loading ? "Connexion…" : "Se connecter"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
