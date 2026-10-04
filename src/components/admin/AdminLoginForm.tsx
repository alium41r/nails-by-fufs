"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <Input
        id="admin-email"
        type="email"
        label="Email"
        autoComplete="username"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <Input
        id="admin-password"
        type="password"
        label="Password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      {error && (
        <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}

      <Button type="submit" variant="primary" size="md" isLoading={isSubmitting} className="w-full">
        Sign In
      </Button>
    </form>
  );
}
