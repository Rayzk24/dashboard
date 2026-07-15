import { useState, type FormEvent } from 'react';
import { ArrowRight, KeyRound, Lock, Mail, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';

type AuthScreenProps = {
  adminExists: boolean;
  gateError: string | null;
  onAdminStatusRefresh: () => Promise<boolean>;
};

export default function AuthScreen({
  adminExists,
  gateError,
  onAdminStatusRefresh,
}: AuthScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(gateError);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const mode = adminExists ? 'login' : 'setup';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const authAction =
      mode === 'setup'
        ? supabase.auth.signUp({ email, password })
        : supabase.auth.signInWithPassword({ email, password });

    const { data, error: authError } = await authAction;

    if (authError) {
      setError(toFriendlyAuthError(authError.message));
      setSubmitting(false);
      return;
    }

    if (mode === 'setup') {
      await onAdminStatusRefresh();

      if (!data.session) {
        setMessage('Compte créé. Confirme ton email, puis connecte-toi.');
      }
    }

    setSubmitting(false);
  }

  return (
    <main className="auth-screen relative min-h-screen overflow-hidden px-6 py-10">
      <div className="minecraft-pattern pointer-events-none absolute inset-0" />
      <div className="auth-screen-gradient absolute inset-0" />

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        className="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center"
      >
        <div className="panel auth-card w-full p-7 sm:p-8">
          <div className="mb-8 flex items-center justify-between">
            <div className="text-xl font-extrabold">
              Rayzk<span className="auth-accent">.</span>
            </div>
            <div className="auth-emblem flex h-11 w-11 items-center justify-center rounded-2xl">
              {mode === 'setup' ? <ShieldCheck size={21} /> : <Lock size={21} />}
            </div>
          </div>

          <p className="auth-kicker text-sm font-semibold uppercase">
            {mode === 'setup' ? 'Premier lancement' : 'Espace personnel'}
          </p>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">
            {mode === 'setup' ? 'Créer le compte admin.' : 'Connexion.'}
          </h1>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <label className="block">
              <span className="auth-label mb-2 block text-sm font-semibold">
                Email
              </span>
              <span className="auth-field-control flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition">
                <Mail size={18} />
                <input
                  required
                  autoComplete="email"
                  className="w-full bg-transparent outline-none"
                  inputMode="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="email@domaine.fr"
                  type="email"
                  value={email}
                />
              </span>
            </label>

            <label className="block">
              <span className="auth-label mb-2 block text-sm font-semibold">
                Mot de passe
              </span>
              <span className="auth-field-control flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition">
                <KeyRound size={18} />
                <input
                  required
                  autoComplete={
                    mode === 'setup' ? 'new-password' : 'current-password'
                  }
                  className="w-full bg-transparent outline-none"
                  minLength={8}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="8 caractères minimum"
                  type="password"
                  value={password}
                />
              </span>
            </label>

            {error ? (
              <p className="auth-message auth-message-error rounded-2xl border px-4 py-3 text-sm">
                {error}
              </p>
            ) : null}

            {message ? (
              <p className="auth-message auth-message-success rounded-2xl border px-4 py-3 text-sm">
                {message}
              </p>
            ) : null}

            <button
              className="auth-submit group inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
              type="submit"
            >
              {mode === 'setup' ? 'Créer le compte' : 'Se connecter'}
              <ArrowRight
                className="transition group-hover:translate-x-0.5"
                size={17}
              />
            </button>
          </form>
        </div>
      </motion.section>
    </main>
  );
}

function toFriendlyAuthError(message: string) {
  if (message.includes('Invalid login credentials')) {
    return 'Email ou mot de passe incorrect.';
  }

  if (message.includes('Admin account already exists')) {
    return 'Un compte administrateur existe déjà.';
  }

  if (message.includes('User already registered')) {
    return 'Ce compte existe déjà. Connecte-toi avec ce compte.';
  }

  return message;
}
