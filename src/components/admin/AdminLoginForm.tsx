"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AdminButton, Field, TextInput } from "@/components/admin/ui/controls";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const ERROR_COPY: Record<string, string> = {
  not_admin:
    "That account is not on the studio's admin allowlist, so it cannot open the admin area.",
  not_configured:
    "Admin sign-in is not configured yet. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and ADMIN_EMAILS, then reload.",
  auth: "Those credentials were not accepted.",
};

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/admin";
  const initialError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError ? ERROR_COPY[initialError] ?? null : null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        // Deliberately generic: never reveal whether the account exists.
        setError(ERROR_COPY.auth);
        return;
      }

      router.replace(next.startsWith("/admin") ? next : "/admin");
      router.refresh();
    } catch {
      setError(ERROR_COPY.not_configured);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <Field label="Email" htmlFor="admin-email">
        <TextInput
          id="admin-email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>

      <Field label="Password" htmlFor="admin-password">
        <TextInput
          id="admin-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </Field>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-[13px] leading-relaxed text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
        >
          {error}
        </p>
      )}

      <AdminButton type="submit" variant="primary" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Signing in…" : "Sign in"}
      </AdminButton>
    </form>
  );
}
