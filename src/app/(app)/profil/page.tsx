import { redirect } from "next/navigation";
import { requireMember } from "@/lib/api";

/** « Mon profil » : la page publique, telle que les autres la voient, avec le bouton pour la modifier. */
export default async function MyProfilePage() {
  const viewer = await requireMember();
  redirect(`/developpeurs/${viewer.profile.username}`);
}
