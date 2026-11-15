import Link from "next/link";
import { cn } from "@/lib/utils";

/** Le pont : deux développeurs reliés par un échange. */
export function LogoMark({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8 shrink-0", className)} aria-hidden>
      <rect width="32" height="32" rx="9" fill={onDark ? "#FFFFFF" : "#101B36"} />
      <path d="M8.5 20.5c2.6-7.6 12.4-7.6 15 0" fill="none" stroke="#28B8D5" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="8.5" cy="20.5" r="3.1" fill={onDark ? "#101B36" : "#FFFFFF"} />
      <circle cx="23.5" cy="20.5" r="3.1" fill={onDark ? "#101B36" : "#FFFFFF"} />
    </svg>
  );
}

export function Logo({
  href = "/",
  onDark = false,
  className,
}: {
  href?: string;
  onDark?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="DevBridge — accueil"
      className={cn("inline-flex items-center gap-2.5 rounded-xl", className)}
    >
      <LogoMark onDark={onDark} />
      <span className={cn("text-[17px] font-semibold tracking-tight", onDark ? "text-white" : "text-ink")}>
        DevBridge
      </span>
    </Link>
  );
}
