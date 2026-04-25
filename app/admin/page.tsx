"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminPage() {
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    supabase
      .from("prompts")
      .select("content")
      .eq("name", "single_tweet_analysis")
      .single()
      .then(({ data }) => {
        if (data) setContent(data.content);
      });
  }, []);

  async function handleSave() {
    setStatus("saving");
    const { error } = await supabase
      .from("prompts")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("name", "single_tweet_analysis");

    setStatus(error ? "error" : "saved");
    setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <main style={{ maxWidth: 700, margin: "60px auto", padding: "0 24px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
        Prompt — Analisi Tweet
      </h1>
      <p style={{ color: "#666", marginBottom: 16, fontSize: 14 }}>
        Modifica il prompt usato da Claude per generare il post LinkedIn.
      </p>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={18}
        style={{
          width: "100%",
          fontFamily: "monospace",
          fontSize: 13,
          padding: 12,
          borderRadius: 8,
          border: "1px solid #ddd",
          resize: "vertical",
          boxSizing: "border-box",
        }}
      />
      <button
        onClick={handleSave}
        disabled={status === "saving"}
        style={{
          marginTop: 12,
          padding: "10px 24px",
          background: status === "saved" ? "#22c55e" : "#0f172a",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {status === "saving" ? "Salvataggio..." : status === "saved" ? "Salvato ✓" : "Salva prompt"}
      </button>
      {status === "error" && (
        <p style={{ color: "red", marginTop: 8, fontSize: 13 }}>Errore nel salvataggio.</p>
      )}
    </main>
  );
}