import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding/wizard";
import { getSkills, requireViewer } from "@/lib/api";

export const metadata: Metadata = { title: "Bienvenue" };

export default async function WelcomePage() {
  const viewer = await requireViewer("/bienvenue");
  if (viewer.profile.onboarding_completed_at) redirect("/tableau-de-bord");
  const skills = await getSkills();
  return <OnboardingWizard profile={viewer.profile} skills={skills} startAt={viewer.profile.onboarding_step} />;
}
