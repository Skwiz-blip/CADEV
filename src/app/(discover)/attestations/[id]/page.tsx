import { BadgeCheck, FlaskConical, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LogoMark } from "@/components/layout/logo";
import { ExchangeTypeBadge } from "@/components/shared/cards";
import { CopyLinkButton, PrintButton } from "@/components/shared/share-buttons";
import { Avatar, Badge, Notice, SkillList } from "@/components/ui/primitives";
import { rpc } from "@/lib/api";
import { countryName } from "@/lib/data/countries";
import { SITE_URL } from "@/lib/env";
import type { Certificate } from "@/lib/types";
import { formatDate, fullName, isUuid, plural } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

async function loadCertificate(id: string): Promise<Certificate | null> {
  if (!isUuid(id)) return null;
  return rpc<Certificate | null>("get_certificate", { p_id: id });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const certificate = await loadCertificate(id).catch(() => null);
  if (!certificate) return { title: "Attestation introuvable" };
  const names = certificate.members.map((member) => fullName(member.user)).join(" et ");
  return {
    title: `Attestation d'échange · ${certificate.title}`,
    description: `Échange terminé entre ${names}, livrables validés mutuellement sur DevBridge.`,
  };
}

/**
 * Attestation publique d'un échange terminé. Elle n'existe que si les livrables
 * ont été validés et que les deux personnes ont confirmé la clôture.
 */
export default async function CertificatePage({ params }: Props) {
  const { id } = await params;
  const certificate = await loadCertificate(id);
  if (!certificate) notFound();

  const path = `/attestations/${certificate.id}`;
  const reference = certificate.id.slice(0, 8).toUpperCase();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {certificate.is_demo ? (
        <Notice tone="warm" icon={FlaskConical} title="Attestation de démonstration">
          Cet échange a eu lieu entre des profils fictifs, pour illustrer la plateforme.
        </Notice>
      ) : null}

      <article className="print-flat rounded-3xl bg-surface p-7 shadow-card sm:p-12">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <LogoMark />
            <span className="text-[17px] font-semibold tracking-tight text-ink">DevBridge</span>
          </div>
          <Badge tone="ok" size="md">
            <BadgeCheck aria-hidden /> Échange terminé et validé
          </Badge>
        </header>

        <p className="mt-10 text-sm font-semibold text-brand">Attestation d&apos;échange de compétences</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink sm:text-4xl">{certificate.title}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-2.5 text-sm text-muted">
          <ExchangeTypeBadge type={certificate.exchange_type} />
          {certificate.is_loop ? <Badge tone="flow">Maillon d&apos;une boucle à trois</Badge> : null}
          <span>
            Du {formatDate(certificate.start_date)} au {formatDate(certificate.completed_at)}
          </span>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {certificate.members.map((member) => (
            <section key={member.user?.id ?? "x"} className="rounded-2xl bg-canvas p-5">
              <div className="flex items-center gap-3">
                <Avatar person={member.user} size="lg" />
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold text-ink">
                    {member.user ? (
                      <Link href={`/developpeurs/${member.user.username}`} className="hover:text-brand">
                        {fullName(member.user)}
                      </Link>
                    ) : (
                      "Compte supprimé"
                    )}
                  </h2>
                  <p className="text-sm text-muted">{countryName(member.user?.country) ?? ""}</p>
                </div>
              </div>
              <p className="mb-2 mt-5 text-xs font-medium text-faint">A apporté</p>
              <SkillList skills={member.gives} tone="offer" max={8} empty="A reçu un accompagnement" />
              <p className="mt-5 text-sm text-ink">
                <strong className="font-semibold tabular-nums">{member.deliverables_validated}</strong>{" "}
                {member.deliverables_validated > 1 ? "livrables validés" : "livrable validé"} par son partenaire
              </p>
            </section>
          ))}
        </div>

        <div className="mt-8 flex items-start gap-3 rounded-2xl bg-ok-soft p-5 text-sm text-ink">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-ok-strong" aria-hidden />
          <p>
            {plural(certificate.tasks_validated, "tâche")} ont été menées à terme. Chaque livrable a été examiné et
            validé par l&apos;autre participant, et les deux ont confirmé la fin de l&apos;échange. DevBridge atteste
            de ce déroulement ; il ne certifie pas un niveau de compétence.
          </p>
        </div>

        <footer className="mt-10 flex flex-wrap items-end justify-between gap-4 text-xs text-muted">
          <p>
            Référence <span className="font-mono text-ink">{reference}</span>
            <br />
            Vérifiable à l&apos;adresse{" "}
            <span className="font-mono text-ink">
              {SITE_URL.replace(/^https?:\/\//, "")}
              {path}
            </span>
          </p>
          <p>Délivrée le {formatDate(certificate.completed_at)}</p>
        </footer>
      </article>

      <div className="no-print flex flex-wrap justify-center gap-2">
        <CopyLinkButton path={path} label="Copier le lien de l'attestation" />
        <PrintButton />
      </div>
    </div>
  );
}
