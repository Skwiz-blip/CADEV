"use client";

import { Check, Copy, Printer } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import { toast } from "../ui/client";

export function PrintButton({ label = "Imprimer ou enregistrer en PDF" }: { label?: string }) {
  return (
    <Button variant="subtle" onClick={() => window.print()}>
      <Printer aria-hidden /> {label}
    </Button>
  );
}

export function CopyLinkButton({ path, label = "Copier le lien" }: { path: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const url = new URL(path, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Lien copié.");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Copie impossible. Sélectionne l'adresse dans la barre du navigateur.");
    }
  };
  return (
    <Button onClick={copy}>
      {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? "Lien copié" : label}
    </Button>
  );
}
