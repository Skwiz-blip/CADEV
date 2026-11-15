"use client";

import { Check, CircleAlert, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState, useSyncExternalStore, useTransition, type ReactNode } from "react";
import { Toaster as Sonner, toast } from "sonner";
import type { ActionResult } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Dialog, DialogContent, DialogTrigger } from "./dialog";
import { Field, Textarea } from "./field";

// ── Messages de confirmation ─────────────────────────────────────────────
export function Toaster() {
  return (
    <Sonner
      position="bottom-center"
      offset={20}
      mobileOffset={84}
      duration={4200}
      icons={{
        success: <Check className="size-4" aria-hidden />,
        error: <CircleAlert className="size-4" aria-hidden />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full items-start gap-3 rounded-2xl bg-ink px-4 py-3.5 text-sm font-medium text-white shadow-pop",
          icon: "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-ink-3",
          description: "mt-0.5 font-normal text-white/75",
          success: "[&_[data-icon]]:bg-ok",
          error: "[&_[data-icon]]:bg-danger",
        },
      }}
    />
  );
}

export { toast };

// ── Exécution d'une action serveur ───────────────────────────────────────
type RunOptions<T> = {
  success?: string | ((data: T) => string);
  onSuccess?: (data: T) => void;
  onError?: (result: Extract<ActionResult, { ok: false }>) => void;
  refresh?: boolean;
};

/**
 * Lance une action serveur avec un état « en cours » (qui bloque les doubles
 * envois), un message de réussite et un message d'erreur lisible.
 */
export function useAction() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const run = useCallback(
    <T,>(action: () => Promise<ActionResult<T> | undefined | void>, options: RunOptions<T> = {}) => {
      startTransition(async () => {
        let result: ActionResult<T> | undefined | void;
        try {
          result = await action();
        } catch {
          toast.error("La connexion a été interrompue. Vérifie ton réseau et réessaie.");
          return;
        }
        // Une action qui redirige ne renvoie rien : la navigation est en cours.
        if (!result) return;
        if (!result.ok) {
          if (options.onError) options.onError(result);
          else toast.error(result.error);
          return;
        }
        if (options.success) {
          toast.success(typeof options.success === "function" ? options.success(result.data) : options.success);
        }
        options.onSuccess?.(result.data);
        if (options.refresh) router.refresh();
      });
    },
    [router],
  );

  return { pending, run };
}

// ── Confirmation avant une opération importante ──────────────────────────
type ConfirmProps = {
  trigger: ReactNode;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  tone?: "primary" | "danger";
  note?: { label: string; placeholder?: string; required?: boolean; minLength?: number };
  action: (note: string) => Promise<ActionResult<unknown> | undefined | void>;
  success?: string;
  onDone?: () => void;
};

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  tone = "primary",
  note,
  action,
  success,
  onDone,
}: ConfirmProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string>();
  const { pending, run } = useAction();

  const submit = () => {
    const trimmed = value.trim();
    if (note?.required && trimmed.length < (note.minLength ?? 1)) {
      setError(`${note.minLength ?? 1} caractères minimum.`);
      return;
    }
    setError(undefined);
    run(() => action(trimmed), {
      success,
      refresh: true,
      onSuccess: () => {
        setOpen(false);
        setValue("");
        onDone?.();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={title} description={description}>
        <div className="space-y-5">
          {note ? (
            <Field label={note.label} htmlFor="confirm-note" error={error} optional={!note.required}>
              <Textarea
                id="confirm-note"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder={note.placeholder}
                maxLength={1000}
                aria-invalid={Boolean(error)}
                autoFocus
              />
            </Field>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="subtle" onClick={() => setOpen(false)} disabled={pending}>
              Annuler
            </Button>
            <Button variant={tone === "danger" ? "danger" : "primary"} onClick={submit} loading={pending}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Pastilles de choix (une ou plusieurs valeurs) ────────────────────────
type ChoiceOption<T extends string> = { value: T; label: string; hint?: string };

export function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
  multiple = true,
  label,
  invalid,
  size = "md",
}: {
  options: ChoiceOption<T>[];
  value: T[];
  onChange: (next: T[]) => void;
  multiple?: boolean;
  label: string;
  invalid?: boolean;
  size?: "sm" | "md";
}) {
  const toggle = (option: T) => {
    if (!multiple) {
      onChange([option]);
      return;
    }
    onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option]);
  };
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("flex flex-wrap gap-2 rounded-xl", invalid && "outline-2 outline-offset-4 outline-danger")}
    >
      {options.map((option) => {
        const selected = value.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => toggle(option.value)}
            className={cn(
              "rounded-xl text-left font-medium transition-colors",
              size === "sm" ? "px-3 py-1.5 text-[13px]" : "px-3.5 py-2 text-sm",
              selected ? "bg-ink text-white" : "bg-field text-ink hover:bg-field-strong",
            )}
          >
            <span className="flex items-center gap-1.5">
              {selected ? <Check className="size-3.5" aria-hidden /> : null}
              {option.label}
            </span>
            {option.hint ? (
              <span className={cn("block text-xs font-normal", selected ? "text-white/70" : "text-muted")}>
                {option.hint}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

// ── Brouillon local : un formulaire ne perd jamais ce qui a été saisi ────
/**
 * Garde un texte dans le navigateur tant qu'il n'a pas été envoyé. Utile quand
 * la connexion coupe au mauvais moment. `clear()` après un envoi réussi.
 */
function subscribeStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

/** Valeur gardée dans le navigateur (null côté serveur et tant que rien n'est enregistré). */
export function useStoredValue(key: string): string | null {
  return useSyncExternalStore(
    subscribeStorage,
    () => {
      try {
        return window.localStorage.getItem(key);
      } catch {
        // Stockage indisponible (navigation privée) : on continue sans brouillon.
        return null;
      }
    },
    () => null,
  );
}

export function writeStoredValue(key: string, value: string | null): void {
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch {
    // Stockage indisponible : sans conséquence.
  }
}

export function useDraft(key: string, initial = ""): [string, (value: string) => void, () => void] {
  const storageKey = `devbridge:brouillon:${key}`;
  const stored = useStoredValue(storageKey);
  // Ce que la personne a tapé depuis l'ouverture ; sinon le brouillon retrouvé ; sinon la valeur de départ.
  const [typed, setTyped] = useState<string | null>(null);
  const value = typed ?? stored ?? initial;

  const update = useCallback(
    (next: string) => {
      setTyped(next);
      writeStoredValue(storageKey, next || null);
    },
    [storageKey],
  );

  const clear = useCallback(() => {
    setTyped("");
    writeStoredValue(storageKey, null);
  }, [storageKey]);

  return [value, update, clear];
}

// ── Bandeau hors connexion ───────────────────────────────────────────────
function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div
      role="status"
      className="no-print fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 bg-ink px-4 py-2 text-center text-sm font-medium text-white"
    >
      <WifiOff className="size-4 shrink-0" aria-hidden />
      Tu es hors connexion. Ce que tu écris est gardé sur cet appareil jusqu&apos;au retour du réseau.
    </div>
  );
}
