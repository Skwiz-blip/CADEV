import { Plug } from "lucide-react";
import { Notice } from "../ui/primitives";

/** Affiché tant que le projet Supabase n'est pas branché (variables d'environnement absentes). */
export function NotConfigured() {
  return (
    <Notice tone="warm" icon={Plug} title="Service de données non configuré">
      Les variables <code className="font-mono text-[13px]">NEXT_PUBLIC_SUPABASE_URL</code> et{" "}
      <code className="font-mono text-[13px]">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> ne sont pas renseignées. Voir le
      fichier README pour brancher la base de données.
    </Notice>
  );
}
