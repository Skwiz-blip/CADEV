"use client";

/** Dernier filet de sécurité : affiché si la mise en page racine elle-même échoue. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 24,
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          backgroundColor: "#F4F6FA",
          color: "#101B36",
        }}
      >
        <h1 style={{ fontSize: 24, margin: 0 }}>DevBridge est momentanément indisponible</h1>
        <p style={{ margin: 0, color: "#5B6B82", maxWidth: 420 }}>
          Une erreur inattendue s&apos;est produite. Réessaie dans un instant.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            height: 44,
            padding: "0 20px",
            border: 0,
            borderRadius: 12,
            backgroundColor: "#2457E8",
            color: "#FFFFFF",
            fontSize: 15,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Réessayer
        </button>
      </body>
    </html>
  );
}
