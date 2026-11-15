"use client";

import { DropdownMenu } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Menu = DropdownMenu.Root;
export const MenuTrigger = DropdownMenu.Trigger;

export function MenuContent({
  className,
  align = "end",
  children,
  ...props
}: ComponentProps<typeof DropdownMenu.Content>) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        align={align}
        sideOffset={8}
        collisionPadding={12}
        className={cn(
          "z-50 min-w-56 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-surface p-1.5 shadow-pop outline-none data-[state=open]:animate-pop",
          className,
        )}
        {...props}
      >
        {children}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  );
}

export function MenuItem({
  className,
  tone = "default",
  ...props
}: ComponentProps<typeof DropdownMenu.Item> & { tone?: "default" | "danger" }) {
  return (
    <DropdownMenu.Item
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium outline-none transition-colors [&_svg]:size-4 [&_svg]:shrink-0",
        tone === "danger"
          ? "text-danger-strong data-[highlighted]:bg-danger-soft"
          : "text-ink data-[highlighted]:bg-field",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <DropdownMenu.Label className="px-3 pb-1 pt-2 text-xs font-medium text-faint">{children}</DropdownMenu.Label>;
}

export function MenuGap() {
  return <div aria-hidden className="h-1.5" />;
}
