"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const supabase = createClient();

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setMessage(error.message);
      } else if (!data.session) {
        setMessage("Check your email to confirm your account, then sign in.");
      } else {
        router.push("/");
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(error.message);
      } else {
        router.push("/");
        router.refresh();
      }
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-6 pt-16">
      <div className="text-center">
        <h1 className="text-2xl font-bold">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-fg-secondary">
          Track your biomarkers. Understand your health.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-edge bg-surface px-4 py-3 text-base outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Password
          <input
            type="password"
            required
            minLength={8}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl border border-edge bg-surface px-4 py-3 text-base outline-none focus:border-accent"
          />
        </label>

        {message && (
          <p role="alert" className="rounded-xl bg-insight px-4 py-3 text-sm text-fg-secondary">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-accent py-3.5 text-sm font-semibold text-accent-fg disabled:opacity-60"
        >
          {busy ? "…" : mode === "signin" ? "Sign in" : "Sign up"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setMessage(null);
        }}
        className="text-sm text-fg-secondary underline-offset-4 hover:underline"
      >
        {mode === "signin"
          ? "New here? Create an account"
          : "Already have an account? Sign in"}
      </button>

      <p className="text-center text-xs text-fg-muted">
        For informational purposes only — not medical advice.
      </p>
    </div>
  );
}
