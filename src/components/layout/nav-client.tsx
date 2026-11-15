"use client";

import {
  ArrowLeftRight,
  Bell,
  CircleUserRound,
  Compass,
  Handshake,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Megaphone,
  Menu as MenuIcon,
  MessageSquare,
  Settings,
  Shield,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { signOutAction } from "@/lib/actions/auth";
import { fetchNotificationsAction, markNotificationsReadAction } from "@/lib/actions/messaging";
import { isSupabaseConfigured } from "@/lib/env";
import { publicNav } from "@/lib/site";
import { getBrowserClient } from "@/lib/supabase/client";
import type { NotificationItem, ProfileMini } from "@/lib/types";
import { cn, fullName, timeAgo } from "@/lib/utils";
import { Button } from "../ui/button";
import { toast } from "../ui/client";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "../ui/dialog";
import { Menu, MenuContent, MenuGap, MenuItem, MenuLabel, MenuTrigger } from "../ui/menu";
import { Avatar, Skeleton } from "../ui/primitives";

const ICONS = {
  dashboard: LayoutDashboard,
  matches: Sparkles,
  explore: Compass,
  developers: Users,
  exchanges: ArrowLeftRight,
  collaborations: Handshake,
  offers: Megaphone,
  messages: MessageSquare,
  profile: CircleUserRound,
  skills: ListChecks,
  notifications: Bell,
  settings: Settings,
  admin: Shield,
} satisfies Record<string, LucideIcon>;

export type NavIcon = keyof typeof ICONS;

function isActive(pathname: string, href: string, exact = false): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function CountDot({ count, active }: { count?: number; active?: boolean }) {
  if (!count) return null;
  return (
    <span
      className={cn(
        "ml-auto min-w-5 rounded-full px-1.5 text-center text-xs font-semibold tabular-nums leading-5",
        active ? "bg-white text-ink" : "bg-brand text-white",
      )}
    >
      {count > 99 ? "99+" : count}
      <span className="sr-only"> en attente</span>
    </span>
  );
}

/** Lien de la barre latérale (bureau). */
export function SideLink({
  href,
  label,
  icon,
  count,
  also = [],
}: {
  href: string;
  label: string;
  icon: NavIcon;
  count?: number;
  also?: string[];
}) {
  const pathname = usePathname();
  const active = [href, ...also].some((path) => isActive(pathname, path));
  const Icon = ICONS[icon];
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
        active ? "bg-ink text-white" : "text-muted hover:bg-field hover:text-ink",
      )}
    >
      <Icon className="size-[18px] shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
      <CountDot count={count} active={active} />
    </Link>
  );
}

/** Lien de la barre basse (téléphone). */
export function TabLink({
  href,
  label,
  icon,
  count,
  also = [],
}: {
  href: string;
  label: string;
  icon: NavIcon;
  count?: number;
  also?: string[];
}) {
  const pathname = usePathname();
  const active = [href, ...also].some((path) => isActive(pathname, path));
  const Icon = ICONS[icon];
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium transition-colors",
        active ? "text-brand" : "text-muted",
      )}
    >
      <span className={cn("relative flex h-7 w-12 items-center justify-center rounded-full", active && "bg-brand-soft")}>
        <Icon className="size-5" aria-hidden />
        {count ? (
          <span className="absolute -right-0.5 -top-1 min-w-4 rounded-full bg-brand px-1 text-center text-[10px] font-semibold leading-4 text-white">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

/** Lien du menu public (site vitrine). */
export function TopLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = isActive(pathname, href, href === "/");
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
        active ? "bg-field text-ink" : "text-muted hover:text-ink",
      )}
    >
      {label}
    </Link>
  );
}

/** En-tête public : léger au repos, il se détache du contenu dès qu'on défile. */
export function HeaderShell({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header
      className={cn(
        "no-print sticky top-0 z-40 bg-surface/90 backdrop-blur-md transition-shadow duration-300",
        scrolled ? "shadow-card" : "shadow-none",
      )}
    >
      {children}
    </header>
  );
}

/** Vrai si une session existe. Lu côté serveur quand c'est connu, sinon dans le navigateur. */
function useSignedIn(known?: boolean): boolean {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    if (known !== undefined || !isSupabaseConfigured) return;
    let active = true;
    void getBrowserClient()
      .auth.getSession()
      .then(({ data }) => {
        if (active) setSignedIn(Boolean(data.session));
      });
    return () => {
      active = false;
    };
  }, [known]);
  return known ?? signedIn;
}

export function AuthButtons({ authenticated }: { authenticated?: boolean }) {
  const signedIn = useSignedIn(authenticated);
  if (signedIn) {
    return (
      <Button asChild size="sm" className="hidden md:inline-flex">
        <Link href="/tableau-de-bord">Mon espace</Link>
      </Button>
    );
  }
  return (
    <>
      <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
        <Link href="/connexion">Connexion</Link>
      </Button>
      <Button asChild size="sm" className="hidden sm:inline-flex">
        <Link href="/inscription">Rejoindre DevBridge</Link>
      </Button>
    </>
  );
}

export function MobileMenu({ authenticated }: { authenticated?: boolean }) {
  const signedIn = useSignedIn(authenticated);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const lastPath = useRef(pathname);
  useEffect(() => {
    if (lastPath.current !== pathname) {
      lastPath.current = pathname;
      setOpen(false);
    }
  }, [pathname]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Ouvrir le menu" className="md:hidden">
          <MenuIcon aria-hidden />
        </Button>
      </DialogTrigger>
      <DialogContent title="Menu">
        <nav aria-label="Navigation principale" className="flex flex-col gap-1">
          {publicNav.map((item) => (
            <DialogClose asChild key={item.href}>
              <Link
                href={item.href}
                className="rounded-xl px-3 py-3 text-base font-medium text-ink hover:bg-field"
              >
                {item.label}
              </Link>
            </DialogClose>
          ))}
        </nav>
        <div className="mt-5 flex flex-col gap-2">
          {signedIn ? (
            <Button asChild block>
              <Link href="/tableau-de-bord">Mon espace</Link>
            </Button>
          ) : (
            <>
              <Button asChild block>
                <Link href="/inscription">Rejoindre DevBridge</Link>
              </Button>
              <Button asChild variant="subtle" block>
                <Link href="/connexion">Connexion</Link>
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function UserMenu({ person, isAdmin }: { person: ProfileMini; isAdmin: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <Menu>
      <MenuTrigger
        aria-label="Ouvrir le menu du compte"
        className="rounded-full outline-offset-2 transition-opacity hover:opacity-85"
      >
        <Avatar person={person} size="sm" />
      </MenuTrigger>
      <MenuContent>
        <div className="px-3 pb-2 pt-2">
          <p className="truncate text-sm font-semibold text-ink">{fullName(person)}</p>
          <p className="truncate text-xs text-muted">@{person.username}</p>
        </div>
        <MenuItem asChild>
          <Link href="/profil">
            <CircleUserRound aria-hidden /> Mon profil
          </Link>
        </MenuItem>
        <MenuItem asChild>
          <Link href="/competences">
            <ListChecks aria-hidden /> Mes compétences
          </Link>
        </MenuItem>
        <MenuItem asChild>
          <Link href="/mes-annonces">
            <Megaphone aria-hidden /> Mes annonces
          </Link>
        </MenuItem>
        <MenuItem asChild>
          <Link href="/parametres">
            <Settings aria-hidden /> Paramètres
          </Link>
        </MenuItem>
        {isAdmin ? (
          <>
            <MenuLabel>Administration</MenuLabel>
            <MenuItem asChild>
              <Link href="/admin">
                <Shield aria-hidden /> Espace d&apos;administration
              </Link>
            </MenuItem>
          </>
        ) : null}
        <MenuGap />
        <MenuItem
          tone="danger"
          disabled={pending}
          onSelect={(event) => {
            event.preventDefault();
            startTransition(async () => {
              await signOutAction();
            });
          }}
        >
          <LogOut aria-hidden /> {pending ? "Déconnexion…" : "Se déconnecter"}
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

/**
 * Cloche de notifications. Elle écoute la base en temps réel : une nouvelle
 * notification met à jour le compteur et s'annonce par un message discret.
 */
export function NotificationBell({ userId, unread }: { userId: string; unread: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = getBrowserClient();
    const scheduleRefresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => router.refresh(), 400);
    };
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as { title?: string; link?: string | null };
            if (row.title) {
              toast(row.title, {
                action: row.link ? { label: "Voir", onClick: () => router.push(row.link!) } : undefined,
              });
            }
          }
          setItems(null);
          scheduleRefresh();
        },
      )
      .subscribe();
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [userId, router]);

  const load = () => {
    setFailed(false);
    startTransition(async () => {
      const result = await fetchNotificationsAction();
      if (result.ok) setItems(result.data.items);
      else setFailed(true);
    });
  };

  const markAll = () => {
    startTransition(async () => {
      const result = await markNotificationsReadAction(null);
      if (result.ok) {
        setItems((current) => current?.map((item) => ({ ...item, is_read: true })) ?? null);
        router.refresh();
      }
    });
  };

  return (
    <Menu
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next && items === null) load();
      }}
    >
      <MenuTrigger
        aria-label={unread ? `Notifications : ${unread} non lue${unread > 1 ? "s" : ""}` : "Notifications"}
        className="relative flex size-10 items-center justify-center rounded-xl text-ink transition-colors hover:bg-field"
      >
        <Bell className="size-[18px]" aria-hidden />
        {unread ? (
          <span className="absolute right-1.5 top-1.5 min-w-4 rounded-full bg-brand px-1 text-center text-[10px] font-semibold leading-4 text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </MenuTrigger>
      <MenuContent className="w-[22rem] p-0">
        <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-4">
          <p className="text-sm font-semibold text-ink">Notifications</p>
          {unread ? (
            <button
              type="button"
              onClick={markAll}
              disabled={pending}
              className="text-xs font-medium text-brand hover:underline disabled:opacity-50"
            >
              Tout marquer comme lu
            </button>
          ) : null}
        </div>
        <div className="max-h-[22rem] overflow-y-auto px-1.5 pb-1.5">
          {failed ? (
            <div className="px-3 py-6 text-center text-sm text-muted">
              Chargement impossible.{" "}
              <button type="button" onClick={load} className="link">
                Réessayer
              </button>
            </div>
          ) : items === null ? (
            <div className="space-y-2 p-2.5" aria-busy="true">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted">Aucune notification pour le moment.</p>
          ) : (
            items.map((item) => (
              <MenuItem key={item.id} asChild className="items-start">
                <Link href={item.link ?? "/notifications"}>
                  <span
                    aria-hidden
                    className={cn("mt-1.5 size-2 shrink-0 rounded-full", item.is_read ? "bg-transparent" : "bg-brand")}
                  />
                  <span className="min-w-0">
                    <span className={cn("block text-sm", item.is_read ? "font-normal text-muted" : "font-semibold text-ink")}>
                      {item.title}
                    </span>
                    <span className="block text-xs font-normal text-faint">{timeAgo(item.created_at)}</span>
                  </span>
                </Link>
              </MenuItem>
            ))
          )}
        </div>
        <div className="bg-canvas px-4 py-3 text-center rounded-b-2xl">
          <Link href="/notifications" className="text-sm font-medium text-brand hover:underline" onClick={() => setOpen(false)}>
            Voir toutes les notifications
          </Link>
        </div>
      </MenuContent>
    </Menu>
  );
}
