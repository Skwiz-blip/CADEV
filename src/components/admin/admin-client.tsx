"use client";

import { Ban, CircleCheck, FlaskConical, RefreshCw, RotateCcw, Trash2, UserCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  handleReportAction,
  moderateOfferAction,
  purgeDemoAction,
  resetDemoAction,
  setUserStatusAction,
} from "@/lib/actions/admin";
import type { OfferStatus, ReportStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { ConfirmDialog, useAction } from "../ui/client";

const TABS = [
  { href: "/admin", label: "Vue d'ensemble" },
  { href: "/admin/utilisateurs", label: "Utilisateurs" },
  { href: "/admin/annonces", label: "Annonces" },
  { href: "/admin/signalements", label: "Signalements" },
  { href: "/admin/statistiques", label: "Statistiques" },
];

export function AdminTabs({ openReports }: { openReports: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Sections de l'administration" className="scroll-quiet -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-1.5">
        {TABS.map((tab) => {
          const active = tab.href === "/admin" ? pathname === "/admin" : pathname.startsWith(tab.href);
          const count = tab.href === "/admin/signalements" ? openReports : 0;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors",
                  active ? "bg-ink text-white" : "bg-surface text-muted hover:text-ink",
                )}
              >
                {tab.label}
                {count ? (
                  <span className={cn("rounded-full px-1.5 text-xs tabular-nums", active ? "bg-white text-ink" : "bg-danger text-white")}>
                    {count}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function UserStatusButton({
  userId,
  name,
  status,
  locked,
}: {
  userId: string;
  name: string;
  status: "active" | "suspended";
  locked: boolean;
}) {
  if (locked) return <span className="text-xs text-faint">Compte administrateur</span>;
  if (status === "suspended") {
    return (
      <ConfirmDialog
        trigger={
          <Button variant="soft" size="sm">
            <UserCheck aria-hidden /> Réactiver
          </Button>
        }
        title={`Réactiver le compte de ${name} ?`}
        description="La personne retrouvera l'ensemble de ses droits et sera prévenue."
        confirmLabel="Réactiver le compte"
        note={{ label: "Note", placeholder: "Facultatif" }}
        action={(note) => setUserStatusAction(userId, "active", note)}
        success="Compte réactivé."
      />
    );
  }
  return (
    <ConfirmDialog
      trigger={
        <Button variant="danger-soft" size="sm">
          <Ban aria-hidden /> Suspendre
        </Button>
      }
      title={`Suspendre le compte de ${name} ?`}
      description="La personne pourra encore consulter son espace, mais plus publier, proposer ni écrire. Ses annonces et son profil ne seront plus visibles. Le motif lui sera communiqué."
      confirmLabel="Suspendre le compte"
      tone="danger"
      note={{ label: "Motif (communiqué à la personne)", required: true, minLength: 5 }}
      action={(note) => setUserStatusAction(userId, "suspended", note)}
      success="Compte suspendu."
    />
  );
}

export function OfferModerationButton({ offerId, status }: { offerId: string; status: OfferStatus }) {
  if (status === "removed") {
    return (
      <ConfirmDialog
        trigger={
          <Button variant="soft" size="sm">
            <RotateCcw aria-hidden /> Remettre en ligne
          </Button>
        }
        title="Remettre cette annonce en ligne ?"
        description="Elle redeviendra visible par tous. Son auteur sera prévenu."
        confirmLabel="Remettre en ligne"
        note={{ label: "Note", placeholder: "Facultatif" }}
        action={(note) => moderateOfferAction(offerId, "restore", note)}
        success="Annonce remise en ligne."
      />
    );
  }
  return (
    <ConfirmDialog
      trigger={
        <Button variant="danger-soft" size="sm">
          <Trash2 aria-hidden /> Retirer
        </Button>
      }
      title="Retirer cette annonce ?"
      description="Elle ne sera plus visible, et les propositions en attente seront annulées. Le motif sera communiqué à son auteur."
      confirmLabel="Retirer l'annonce"
      tone="danger"
      note={{ label: "Motif (communiqué à l'auteur)", required: true, minLength: 5 }}
      action={(note) => moderateOfferAction(offerId, "remove", note)}
      success="Annonce retirée."
    />
  );
}

export function ReportActions({ reportId, status }: { reportId: string; status: ReportStatus }) {
  const { pending, run } = useAction();
  if (status === "resolved" || status === "dismissed") return null;
  return (
    <div className="flex flex-wrap gap-2">
      {status === "open" ? (
        <Button
          variant="subtle"
          size="sm"
          loading={pending}
          onClick={() => run(() => handleReportAction(reportId, "in_review", ""), { refresh: true, success: "Signalement pris en charge." })}
        >
          Prendre en charge
        </Button>
      ) : null}
      <ConfirmDialog
        trigger={
          <Button size="sm">
            <CircleCheck aria-hidden /> Marquer comme traité
          </Button>
        }
        title="Clôturer ce signalement ?"
        description="Indique ce qui a été décidé. La personne qui a signalé sera prévenue."
        confirmLabel="Marquer comme traité"
        note={{ label: "Décision prise", required: true, minLength: 5 }}
        action={(note) => handleReportAction(reportId, "resolved", note)}
        success="Signalement traité."
      />
      <ConfirmDialog
        trigger={
          <Button variant="subtle" size="sm">
            Classer sans suite
          </Button>
        }
        title="Classer ce signalement sans suite ?"
        description="Explique pourquoi aucune action n'est nécessaire. La personne qui a signalé sera prévenue."
        confirmLabel="Classer sans suite"
        note={{ label: "Raison", required: true, minLength: 5 }}
        action={(note) => handleReportAction(reportId, "dismissed", note)}
        success="Signalement classé."
      />
    </div>
  );
}

/** Création, remise à zéro et suppression des données de démonstration. */
export function DemoDataCard({ demoProfiles, available }: { demoProfiles: number; available: boolean }) {
  return (
    <div className="rounded-2xl bg-warm-soft p-5 sm:p-6">
      <div className="flex items-start gap-3.5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface text-warm-strong">
          <FlaskConical className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-ink">Données de démonstration</h2>
          <p className="mt-1 text-sm text-ink/80">
            {demoProfiles > 0
              ? `${demoProfiles} profils fictifs sont en ligne, tous marqués « Démo ».`
              : "Aucun profil de démonstration pour le moment."}{" "}
            La remise à zéro recrée dix profils, des annonces, un échange terminé, un échange en cours et une
            proposition en attente.
          </p>
        </div>
      </div>
      {available ? (
        <div className="mt-5 flex flex-wrap gap-2">
          <ConfirmDialog
            trigger={
              <Button variant="dark">
                <RefreshCw aria-hidden /> {demoProfiles > 0 ? "Réinitialiser la démonstration" : "Créer la démonstration"}
              </Button>
            }
            title="Réinitialiser les données de démonstration ?"
            description="Tous les profils de démonstration et ce qui leur est rattaché seront supprimés puis recréés à l'état d'origine. Les vrais comptes ne sont pas touchés. L'opération dure environ une minute."
            confirmLabel="Réinitialiser"
            action={() => resetDemoAction()}
            success="Données de démonstration prêtes."
          />
          {demoProfiles > 0 ? (
            <ConfirmDialog
              trigger={
                <Button variant="white">
                  <Trash2 aria-hidden /> Supprimer la démonstration
                </Button>
              }
              title="Supprimer toutes les données de démonstration ?"
              description="À faire quand la plateforme accueille de vrais membres. Les profils fictifs et tout ce qui leur est rattaché disparaîtront définitivement."
              confirmLabel="Supprimer la démonstration"
              tone="danger"
              action={() => purgeDemoAction()}
              success="Données de démonstration supprimées."
            />
          ) : null}
        </div>
      ) : (
        <p className="mt-4 rounded-xl bg-surface px-4 py-3 text-sm text-ink">
          Pour gérer la démonstration depuis cette page, renseigne <code className="font-mono text-[13px]">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
          et <code className="font-mono text-[13px]">DEMO_PASSWORD</code> sur le serveur. En local, la commande{" "}
          <code className="font-mono text-[13px]">npm run seed</code> fait la même chose.
        </p>
      )}
    </div>
  );
}
