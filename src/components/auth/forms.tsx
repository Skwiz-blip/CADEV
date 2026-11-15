"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff, FlaskConical, MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ComponentProps } from "react";
import { useForm } from "react-hook-form";
import { demoSignInAction } from "@/lib/actions/admin";
import {
  forgotPasswordAction,
  resendConfirmationAction,
  signInAction,
  signUpAction,
  updatePasswordAction,
} from "@/lib/actions/auth";
import { COUNTRIES } from "@/lib/data/countries";
import {
  forgotPasswordSchema,
  newPasswordSchema,
  signInSchema,
  signUpSchema,
  type ForgotPasswordInput,
  type NewPasswordInput,
  type SignInInput,
  type SignUpInput,
} from "@/lib/validation";
import { Button } from "../ui/button";
import { toast, useAction } from "../ui/client";
import { Checkbox, Field, Input, Select } from "../ui/field";

function PasswordInput(props: ComponentProps<typeof Input>) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="relative block">
      <Input {...props} type={visible ? "text" : "password"} className="pr-12" />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        aria-pressed={visible}
        className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-field-strong hover:text-ink"
      >
        {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </span>
  );
}

function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger-strong">
      {message}
    </p>
  );
}

// ── Connexion ────────────────────────────────────────────────────────────
export function SignInForm({ next }: { next?: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string>();
  const { pending, run } = useAction();
  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });
  const errors = form.formState.errors;

  const submit = form.handleSubmit((values) => {
    setFormError(undefined);
    run(() => signInAction(values, next), {
      onError: (result) => setFormError(result.error),
      onSuccess: (data) => {
        router.replace(data.redirectTo);
        router.refresh();
      },
    });
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <FormError message={formError} />
      <Field label="Adresse e-mail" htmlFor="email" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="toi@exemple.com"
          aria-invalid={Boolean(errors.email)}
          {...form.register("email")}
        />
      </Field>
      <Field label="Mot de passe" htmlFor="password" error={errors.password?.message}>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          {...form.register("password")}
        />
      </Field>
      <div className="flex justify-end">
        <Link href="/mot-de-passe-oublie" className="link text-sm">
          Mot de passe oublié ?
        </Link>
      </div>
      <Button type="submit" block size="lg" loading={pending}>
        Se connecter
      </Button>
    </form>
  );
}

/** Accès en un clic aux deux comptes du parcours de démonstration. */
export function DemoAccounts() {
  const router = useRouter();
  const { pending, run } = useAction();
  const [target, setTarget] = useState<string>();
  const signIn = (account: "kodjo" | "amina") => {
    setTarget(account);
    run(() => demoSignInAction(account), {
      onSuccess: (data) => {
        router.replace(data.redirectTo);
        router.refresh();
      },
    });
  };
  return (
    <div className="rounded-2xl bg-warm-soft p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-warm-strong">
        <FlaskConical className="size-4" aria-hidden /> Comptes de démonstration
      </p>
      <p className="mt-1.5 text-sm text-ink/80">
        Deux profils fictifs et complémentaires, pour essayer le parcours complet sans créer de compte.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button variant="white" onClick={() => signIn("kodjo")} loading={pending && target === "kodjo"} disabled={pending}>
          Kodjo · Flutter
        </Button>
        <Button variant="white" onClick={() => signIn("amina")} loading={pending && target === "amina"} disabled={pending}>
          Amina · Python
        </Button>
      </div>
    </div>
  );
}

// ── Inscription ──────────────────────────────────────────────────────────
export function SignUpForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string>();
  const [sentTo, setSentTo] = useState<string>();
  const { pending, run } = useAction();
  const resend = useAction();
  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: "", lastName: "", email: "", password: "", confirmPassword: "", country: "",
      terms: false as unknown as true,
    },
  });
  const errors = form.formState.errors;

  const submit = form.handleSubmit((values) => {
    setFormError(undefined);
    run(() => signUpAction(values), {
      onSuccess: (data) => {
        if (data.redirectTo) {
          router.replace(data.redirectTo);
          router.refresh();
        } else {
          setSentTo(data.email);
        }
      },
      onError: (result) => {
        setFormError(result.error);
        for (const [field, message] of Object.entries(result.fields ?? {})) {
          form.setError(field as keyof SignUpInput, { message });
        }
      },
    });
  });

  if (sentTo) {
    return (
      <div className="text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-ok-soft text-ok-strong">
          <MailCheck className="size-7" aria-hidden />
        </span>
        <h2 className="mt-6 text-2xl font-semibold text-ink">Vérifie ta boîte mail</h2>
        <p className="mt-3 text-muted">
          Un lien de confirmation vient d&apos;être envoyé à <strong className="font-semibold text-ink">{sentTo}</strong>.
          Ouvre-le pour activer ton compte et compléter ton profil.
        </p>
        <p className="mt-2 text-sm text-muted">Pense à regarder dans les courriers indésirables.</p>
        <div className="mt-8 flex flex-col gap-2">
          <Button
            variant="subtle"
            loading={resend.pending}
            onClick={() =>
              resend.run(() => resendConfirmationAction(sentTo), { success: "E-mail de confirmation renvoyé." })
            }
          >
            Renvoyer l&apos;e-mail
          </Button>
          <Button asChild variant="ghost">
            <Link href="/connexion">J&apos;ai confirmé, me connecter</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <FormError message={formError} />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Prénom" htmlFor="firstName" error={errors.firstName?.message}>
          <Input id="firstName" autoComplete="given-name" aria-invalid={Boolean(errors.firstName)} {...form.register("firstName")} />
        </Field>
        <Field label="Nom" htmlFor="lastName" error={errors.lastName?.message}>
          <Input id="lastName" autoComplete="family-name" aria-invalid={Boolean(errors.lastName)} {...form.register("lastName")} />
        </Field>
      </div>
      <Field label="Adresse e-mail" htmlFor="email" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="toi@exemple.com"
          aria-invalid={Boolean(errors.email)}
          {...form.register("email")}
        />
      </Field>
      <Field label="Pays" htmlFor="country" error={errors.country?.message}>
        <Select id="country" autoComplete="country" aria-invalid={Boolean(errors.country)} {...form.register("country")}>
          <option value="">Choisir un pays</option>
          {COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field
          label="Mot de passe"
          htmlFor="password"
          error={errors.password?.message}
          hint="8 caractères, avec une lettre et un chiffre."
        >
          <PasswordInput id="password" autoComplete="new-password" aria-invalid={Boolean(errors.password)} {...form.register("password")} />
        </Field>
        <Field label="Confirmation" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.confirmPassword)}
            {...form.register("confirmPassword")}
          />
        </Field>
      </div>
      <div>
        <Checkbox aria-invalid={Boolean(errors.terms)} {...form.register("terms")}>
          J&apos;accepte les{" "}
          <Link href="/conditions" target="_blank" className="link">
            conditions d&apos;utilisation
          </Link>{" "}
          et la{" "}
          <Link href="/confidentialite" target="_blank" className="link">
            politique de confidentialité
          </Link>
          .
        </Checkbox>
        {errors.terms ? (
          <p role="alert" className="mt-1.5 text-sm font-medium text-danger-strong">
            {errors.terms.message}
          </p>
        ) : null}
      </div>
      <Button type="submit" block size="lg" loading={pending}>
        Créer mon compte <ArrowRight aria-hidden />
      </Button>
    </form>
  );
}

// ── Mot de passe oublié ──────────────────────────────────────────────────
export function ForgotPasswordForm() {
  const [formError, setFormError] = useState<string>();
  const [sentTo, setSentTo] = useState<string>();
  const { pending, run } = useAction();
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const submit = form.handleSubmit((values) => {
    setFormError(undefined);
    run(() => forgotPasswordAction(values), {
      onSuccess: () => setSentTo(values.email),
      onError: (result) => setFormError(result.error),
    });
  });

  if (sentTo) {
    return (
      <div className="text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-ok-soft text-ok-strong">
          <MailCheck className="size-7" aria-hidden />
        </span>
        <h2 className="mt-6 text-2xl font-semibold text-ink">Regarde tes e-mails</h2>
        <p className="mt-3 text-muted">
          Si un compte existe pour <strong className="font-semibold text-ink">{sentTo}</strong>, un lien pour choisir un
          nouveau mot de passe vient d&apos;être envoyé.
        </p>
        <Button asChild variant="subtle" className="mt-8">
          <Link href="/connexion">Retour à la connexion</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <FormError message={formError} />
      <Field label="Adresse e-mail" htmlFor="email" error={form.formState.errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="toi@exemple.com"
          aria-invalid={Boolean(form.formState.errors.email)}
          {...form.register("email")}
        />
      </Field>
      <Button type="submit" block size="lg" loading={pending}>
        Recevoir le lien
      </Button>
    </form>
  );
}

// ── Nouveau mot de passe ─────────────────────────────────────────────────
export function NewPasswordForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string>();
  const { pending, run } = useAction();
  const form = useForm<NewPasswordInput>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });
  const errors = form.formState.errors;

  const submit = form.handleSubmit((values) => {
    setFormError(undefined);
    run(() => updatePasswordAction(values), {
      onSuccess: () => {
        toast.success("Mot de passe mis à jour.");
        router.replace("/tableau-de-bord");
      },
      onError: (result) => setFormError(result.error),
    });
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <FormError message={formError} />
      <Field
        label="Nouveau mot de passe"
        htmlFor="password"
        error={errors.password?.message}
        hint="8 caractères, avec une lettre et un chiffre."
      >
        <PasswordInput id="password" autoComplete="new-password" aria-invalid={Boolean(errors.password)} {...form.register("password")} />
      </Field>
      <Field label="Confirmation" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
        <PasswordInput
          id="confirmPassword"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.confirmPassword)}
          {...form.register("confirmPassword")}
        />
      </Field>
      <Button type="submit" block size="lg" loading={pending}>
        Enregistrer le mot de passe
      </Button>
    </form>
  );
}
