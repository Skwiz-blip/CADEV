import { ChevronDown } from "lucide-react";
import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("block text-sm font-medium text-ink", className)} {...props} />;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("field", className)} {...props} />;
}

export function Textarea({ className, rows = 4, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={rows} className={cn("field min-h-24", className)} {...props} />;
}

/** Liste déroulante native : la plus fiable et la plus légère sur mobile. */
export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative block">
      <select className={cn("field appearance-none pr-10", className)} {...props}>
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
      />
    </span>
  );
}

type FieldProps = {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  className?: string;
  children: ReactNode;
};

/** Un champ complet : libellé explicite, aide, message d'erreur annoncé aux lecteurs d'écran. */
export function Field({ label, htmlFor, hint, error, optional, className, children }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={htmlFor}>{label}</Label>
        {optional ? <span className="text-xs text-faint">Facultatif</span> : null}
      </div>
      {children}
      {error ? (
        <p role="alert" className="text-sm font-medium text-danger-strong">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

/** Groupe de champs avec une légende (cases à cocher, pastilles de choix). */
export function Fieldset({
  legend,
  hint,
  error,
  optional,
  className,
  children,
}: Omit<FieldProps, "label" | "htmlFor"> & { legend: string }) {
  return (
    <fieldset className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <legend className="text-sm font-medium text-ink">{legend}</legend>
        {optional ? <span className="text-xs text-faint">Facultatif</span> : null}
      </div>
      {hint ? <p className="text-sm text-muted">{hint}</p> : null}
      {children}
      {error ? (
        <p role="alert" className="text-sm font-medium text-danger-strong">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

export function Checkbox({
  className,
  children,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { children: ReactNode }) {
  return (
    <label className={cn("flex items-start gap-3 text-sm text-ink", className)}>
      <input
        type="checkbox"
        className="mt-0.5 size-5 shrink-0 appearance-none rounded-md bg-field transition-colors checked:bg-brand checked:bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%222.6%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M5%2010.5l3.2%203.2L15%207%22%2F%3E%3C%2Fsvg%3E')] hover:bg-field-strong checked:hover:bg-brand-strong aria-[invalid=true]:outline-2 aria-[invalid=true]:outline-danger"
        {...props}
      />
      <span className="leading-relaxed">{children}</span>
    </label>
  );
}
