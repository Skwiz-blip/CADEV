import { Compass, MessagesSquare } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { MessagesFrame } from "@/components/messages/conversation-list";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { requireMember, rpc } from "@/lib/api";
import type { ConversationItem } from "@/lib/types";

export const metadata: Metadata = { title: "Messagerie" };

export default async function MessagesLayout({ children }: { children: ReactNode }) {
  const [viewer, conversations] = await Promise.all([
    requireMember(),
    rpc<ConversationItem[]>("list_my_conversations"),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title="Messagerie" />
      {conversations.length === 0 ? (
        <Card className="p-0 sm:p-0">
          <EmptyState
            icon={MessagesSquare}
            title="Aucune conversation"
            description="Une conversation s'ouvre quand tu envoies ou reçois une proposition d'échange. Pas de message à froid : ici, on se parle pour échanger."
            action={
              <Button asChild>
                <Link href="/pour-toi">
                  <Compass aria-hidden /> Voir mes correspondances
                </Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <MessagesFrame conversations={conversations} viewerId={viewer.profile.id}>
          {children}
        </MessagesFrame>
      )}
    </div>
  );
}
