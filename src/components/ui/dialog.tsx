"use client";

import { X } from "lucide-react";
import { Dialog as RadixDialog } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

/**
 * Fenêtre de dialogue : feuille qui monte du bas sur téléphone (accessible au
 * pouce), fenêtre centrée sur grand écran. Le focus est piégé et restitué.
 */
export function DialogContent({
  title,
  description,
  children,
  className,
  size = "md",
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  size?: "md" | "lg";
}) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-50 bg-ink/45 data-[state=open]:animate-fade" />
      <RadixDialog.Content
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-3xl bg-surface shadow-pop outline-none data-[state=open]:animate-sheet",
          "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100vw-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:data-[state=open]:animate-fade",
          size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-7 sm:pt-7">
          <div className="min-w-0">
            <RadixDialog.Title className="text-xl font-semibold text-ink">{title}</RadixDialog.Title>
            {description ? (
              <RadixDialog.Description className="mt-1.5 text-sm text-muted">{description}</RadixDialog.Description>
            ) : (
              <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
            )}
          </div>
          <RadixDialog.Close
            aria-label="Fermer"
            className="-mr-1.5 -mt-1.5 flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-field hover:text-ink"
          >
            <X className="size-5" aria-hidden />
          </RadixDialog.Close>
        </div>
        <div className="overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:px-7 sm:pb-7">
          {children}
        </div>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}
