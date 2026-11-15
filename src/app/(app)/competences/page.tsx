import { Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SkillsManager } from "@/components/profile/skills-manager";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/primitives";
import { getSkills, requireMember } from "@/lib/api";

export const metadata: Metadata = { title: "Mes compétences" };

export default async function SkillsPage() {
  const [viewer, skills] = await Promise.all([requireMember(), getSkills()]);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Mes compétences"
        description="Deux listes suffisent pour trouver tes correspondances : ce que tu apportes, et ce que tu veux recevoir."
        actions={
          <Button asChild variant="soft">
            <Link href="/pour-toi">
              <Sparkles aria-hidden /> Voir mes correspondances
            </Link>
          </Button>
        }
      />
      <SkillsManager skills={skills} offered={viewer.profile.offered} wanted={viewer.profile.wanted} />
    </div>
  );
}
