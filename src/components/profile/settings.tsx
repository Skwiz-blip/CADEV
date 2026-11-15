"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LogOut, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { signOutAction, updatePasswordAction } from "@/lib/actions/auth";
import { deleteAccountAction } from "@/lib/actions/profile";
import { newPasswordSchema, type NewPasswordInput } from "@/lib/validation";
import { Button } from "../ui/button";
import { toast, useAction } from "../ui/client";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import { Field, Input } from "../ui/field";

export function PasswordForm() {
  const { pending, run } = useAction();
  const form = useForm<NewPasswordInput>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });
  const errors = form.formState.errors;

  const submit = form.handleSubmit((values) => {
    run(() => updatePasswordAction(values), {
      success: "Mot de passe mis à jour.",
      onSuccess: () => form.reset(),
    });
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Nouveau mot de passe" htmlFor="new-password" error={errors.password?.message} hint="8 caractères, avec une lettre et un chiffre.">
          <Input id="new-password" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.password)} {...form.register("password")} />
        </Field>
        <Field label="Confirmation" htmlFor="confirm-password" error={errors.confirmPassword?.message}>
          <Input id="confirm-password" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.confirmPassword)} {...form.register("confirmPassword")} />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" loading={pending}>
          Changer le mot de passe
        </Button>
      </div>
    </form>
  );
}

export function SignOutButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="subtle"
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          await signOutAction();
        })
      }
    >
      {pending ? null : <LogOut aria-hidden />} Se déconnecter
    </Button>
  );
}

export function DeleteAccountDialog() {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const { pending, run } = useAction();
  const ready = confirmation.trim().toUpperCase() === "SUPPRIMER";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
        if (!next) setConfirmation("");
      }}
    >
      <DialogTrigger asChild>
        <Button variant="danger-soft">
          <Trash2 aria-hidden /> Supprimer mon compte
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Supprimer définitivement mon compte ?"
        description="Ton profil, tes annonces, tes propositions, tes collaborations, tes messages et tes évaluations seront effacés. Cette action est irréversible."
      >
        <div className="space-y-5">
          <Field label="Écris SUPPRIMER pour confirmer" htmlFor="delete-confirmation">
            <Input
              id="delete-confirmation"
              value={confirmation}
              autoComplete="off"
              autoCapitalize="characters"
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </Field>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="subtle" onClick={() => setOpen(false)} disabled={pending}>
              Annuler
            </Button>
            <Button
              variant="danger"
              disabled={!ready}
              loading={pending}
              onClick={() =>
                run(() => deleteAccountAction(confirmation), {
                  onError: (result) => toast.error(result.error),
                  // Rechargement complet : plus aucune trace de la session dans la page.
                  onSuccess: (data) => window.location.assign(data.redirectTo),
                })
              }
            >
              Supprimer mon compte
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
