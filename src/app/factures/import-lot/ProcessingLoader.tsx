"use client";

import { useEffect, useState } from "react";

const steps = [
  { label: "Lecture des fichiers", icon: "📄" },
  { label: "Extraction des données", icon: "⚡" },
  { label: "Rapprochement avec tarif", icon: "📊" },
  { label: "Création en base", icon: "💾" },
];

export default function ProcessingLoader({ progression }: { progression: string }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const durations = [8000, 15000, 12000, 15000]; // durées estimées par étape
    let elapsed = 0;
    const total = durations.reduce((a, b) => a + b, 0);
    const interval = setInterval(() => {
      elapsed += 100;
      setProgress(Math.min((elapsed / total) * 100, 97));
      let cumul = 0;
      for (let i = 0; i < durations.length; i++) {
        cumul += durations[i];
        if (elapsed < cumul) {
          setCurrentStep(i);
          break;
        }
        setCurrentStep(durations.length - 1);
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ background: "white", borderRadius: "16px", padding: "36px 32px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
      <style>{`
        @keyframes fc-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fc-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "56px", height: "56px", background: "#FFF7ED", borderRadius: "50%", marginBottom: "16px" }}>
          <div style={{ width: "28px", height: "28px", border: "3px solid #E85A00", borderTopColor: "transparent", borderRadius: "50%", animation: "fc-spin 0.8s linear infinite" }} />
        </div>
        <div style={{ fontSize: "17px", fontWeight: "800", color: "#1F2937", marginBottom: "4px" }}>Import en cours…</div>
        <div style={{ fontSize: "13px", color: "#9CA3AF" }}>{progression}</div>
      </div>
      <div style={{ background: "#F3F4F6", borderRadius: "8px", height: "8px", marginBottom: "28px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #E85A00, #F97316)", borderRadius: "8px", transition: "width 0.3s ease" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {steps.map((s, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0, display: "flex",
                alignItems: "center", justifyContent: "center", fontSize: "13px",
                background: done ? "#16A34A" : active ? "#FFF7ED" : "#F9FAFB",
                border: `2px solid ${done ? "#16A34A" : active ? "#E85A00" : "#E5E7EB"}`,
                transition: "all 0.3s",
              }}>
                {done ? "✓" : s.icon}
              </div>
              <span style={{
                fontSize: "14px", fontWeight: active ? "700" : done ? "500" : "400",
                color: done ? "#16A34A" : active ? "#1F2937" : "#9CA3AF",
                animation: active ? "fc-pulse 1.5s ease-in-out infinite" : undefined,
                transition: "all 0.3s",
              }}>
                {s.label}{active && <span style={{ marginLeft: "6px", color: "#E85A00" }}>…</span>}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: "20px", textAlign: "center", fontSize: "12px", color: "#D1D5DB" }}>
        Durée estimée : 30 à 45 secondes par facture
      </div>
    </div>
  );
}
