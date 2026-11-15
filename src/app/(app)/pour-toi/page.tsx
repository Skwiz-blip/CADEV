import { Compass, Info, ListChecks, Repeat2, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { LoopCandidateCard, LoopCard, RefreshMatchesButton } from "@/components/matching/loops";
import { MatchCard, OfferCard } from "@/components/shared/cards";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Notice, PageHeader, Pagination, SectionTitle, SkillList } from "@/components/ui/primitives";
import { requireMember, rpc } from "@/lib/api";
import type { LoopCandidate, LoopItem, MatchItem, Paginated, RecommendedOffer } from "@/lib/types";
import { firstParam, plural, withParams } from "@/lib/utils";

export const metadata: Metadata = { title: "Pour toi" };

const PAGE_SIZE = 10;

export default async function ForYouPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const page = Math.max(1, Number(firstParam(raw.page)) || 1);
  const viewer = await requireMember();

  const [matches, candidates, loops, offers] = await Promise.all([
    rpc<Paginated<MatchItem>>("get_matches", { p_limit: PAGE_SIZE, p_offset: (page - 1) * PAGE_SIZE }),
    rpc<LoopCandidate[]>("find_exchange_loops", { p_limit: 4 }),
    rpc<LoopItem[]>("list_my_loops"),
    rpc<RecommendedOffer[]>("recommended_offers", { p_limit: 6 }),
  ]);

  const me = viewer.profile;
  const hasOffered = me.offered.length > 0;
  const hasWanted = me.wanted.length > 0;
  const openLoops = loops.filter((loop) => loop.status !== "declined");
  const showLoops = openLoops.length > 0 || candidates.length > 0;

  return (
    <div className="space-y-10">
      <PageHeader
        title="Pour toi"
        description="Les développeurs et les annonces qui complètent tes compétences. Chaque recommandation est expliquée."
        actions={
          <>
            <RefreshMatchesButton />
            <Button asChild variant="soft">
              <Link href="/competences">
                <ListChecks aria-hidden /> Mes compétences
              </Link>
            </Button>
          </>
        }
      />

      {!hasOffered || !hasWanted ? (
        <Notice
          tone="warm"
          icon={Info}
          title={
            !hasOffered && !hasWanted
              ? "Indique ce que tu proposes et ce que tu recherches"
              : !hasOffered
                ? "Indique ce que tu sais faire"
                : "Indique ce que tu recherches"
          }
          action={
            <Button asChild size="sm" variant="white">
              <Link href="/competences">Compléter</Link>
            </Button>
          }
        >
          Une correspondance réciproque demande les deux listes : ce que tu apportes, et ce que tu veux recevoir.
        </Notice>
      ) : null}

      {/* Correspondances */}
      <section className="space-y-4">
        <SectionTitle
          title="Tes correspondances"
          description={
            matches.total
              ? `${plural(matches.total, "personne")} dont les compétences croisent les tiennes, classées par score.`
              : undefined
          }
        />
        {matches.items.length ? (
          <>
            <ul className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {matches.items.map((match) => (
                <li key={match.id}>
                  <MatchCard match={match} viewerTimezone={me.timezone} />
                </li>
              ))}
            </ul>
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={matches.total}
              hrefFor={(target) => withParams("/pour-toi", {}, { page: target > 1 ? target : undefined })}
            />
            <p className="text-xs text-muted">
              Le score additionne cinq critères (compétences, disponibilités, langue, mode de collaboration, pays). C&apos;est
              une aide à la décision, pas une mesure scientifique de compatibilité.
            </p>
          </>
        ) : (
          <Card className="p-0 sm:p-0">
            <EmptyState
              icon={Sparkles}
              title="Aucune correspondance pour le moment"
              description={
                hasOffered || hasWanted
                  ? "Personne ne croise encore tes compétences. Élargis ce que tu recherches, regarde les boucles à trois ci-dessous, ou publie une annonce pour te rendre visible."
                  : "Ajoute tes compétences proposées et recherchées : les correspondances apparaîtront ici dès qu'un profil complète le tien."
              }
              action={
                <>
                  <Button asChild>
                    <Link href="/competences">Mettre à jour mes compétences</Link>
                  </Button>
                  <Button asChild variant="subtle">
                    <Link href="/annonces/nouvelle">Publier une annonce</Link>
                  </Button>
                </>
              }
            />
          </Card>
        )}
      </section>

      {/* Boucles à trois */}
      {showLoops ? (
        <section id="boucles" className="scroll-mt-24 space-y-4">
          <SectionTitle
            title="Boucles d'échange à trois"
            description="Quand la personne qui peut t'aider n'a pas besoin de ce que tu proposes, un troisième développeur ferme la boucle : chacun donne une fois et reçoit une fois."
          />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {openLoops.map((loop) => (
              <LoopCard key={loop.id} loop={loop} me={me.id} />
            ))}
            {candidates.map((loop) => (
              <LoopCandidateCard key={`${loop.b.id}-${loop.c.id}`} loop={loop} me={me} />
            ))}
          </div>
        </section>
      ) : hasOffered && hasWanted ? (
        <section id="boucles" className="scroll-mt-24">
          <Notice tone="flow" icon={Repeat2} title="Boucles d'échange à trois">
            Aucune boucle possible pour l&apos;instant. Dès que trois profils peuvent s&apos;entraider en chaîne, elle te
            sera proposée ici.
          </Notice>
        </section>
      ) : null}

      {/* Annonces recommandées */}
      <section className="space-y-4">
        <SectionTitle
          title="Annonces qui te correspondent"
          description="Des annonces qui proposent ce que tu recherches, ou qui recherchent ce que tu proposes."
          action={
            <Link href="/explorer" className="link text-sm">
              Toutes les annonces
            </Link>
          }
        />
        {offers.length ? (
          <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {offers.map((offer) => (
              <li key={offer.id}>
                <OfferCard
                  offer={offer}
                  viewerId={me.id}
                  highlight={
                    <div className="space-y-2 rounded-xl bg-flow-soft p-3">
                      {offer.match_proposed.length ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-medium text-flow-strong">Tu recherches</span>
                          <SkillList skills={offer.match_proposed} tone="want" max={3} />
                        </div>
                      ) : null}
                      {offer.match_requested.length ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-medium text-flow-strong">Tu proposes</span>
                          <SkillList skills={offer.match_requested} tone="offer" max={3} />
                        </div>
                      ) : null}
                    </div>
                  }
                />
              </li>
            ))}
          </ul>
        ) : (
          <Card className="p-0 sm:p-0">
            <EmptyState
              icon={Compass}
              title="Pas d'annonce ciblée pour le moment"
              description="Aucune annonce en ligne ne croise tes compétences. Tu peux parcourir toutes les annonces, ou publier la tienne."
              action={
                <Button asChild variant="subtle">
                  <Link href="/explorer">Explorer les annonces</Link>
                </Button>
              }
            />
          </Card>
        )}
      </section>
    </div>
  );
}
