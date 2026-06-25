import { AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

type SetupNoticeProps = {
  detail?: string | null;
  variant: 'env' | 'schema';
};

const copy = {
  env: {
    title: 'Variables manquantes',
    body: 'Ajoute les variables Supabase dans un fichier .env.local avant de lancer le dashboard.',
    lines: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'],
  },
  schema: {
    title: 'Schéma Supabase incomplet',
    body: 'Exécute le fichier supabase/schema.sql dans le SQL Editor Supabase, puis recharge la page.',
    lines: ['supabase/schema.sql'],
  },
};

export default function SetupNotice({ detail, variant }: SetupNoticeProps) {
  const content = copy[variant];

  return (
    <main className="relative min-h-screen overflow-hidden bg-paper px-6 py-10 text-ink">
      <div className="minecraft-pattern pointer-events-none absolute inset-0" />
      <div className="absolute inset-0 bg-gradient-to-b from-white via-paper to-white" />
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        className="panel relative mx-auto mt-20 max-w-lg p-8"
      >
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-forest/10 text-forest">
          <AlertCircle size={22} />
        </div>
        <h1 className="text-3xl font-extrabold">{content.title}</h1>
        <p className="mt-4 leading-relaxed text-gray-600">{content.body}</p>
        <div className="mt-6 space-y-2 rounded-2xl bg-paper p-4 text-sm font-semibold text-ink">
          {content.lines.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
        {detail ? (
          <p className="mt-5 rounded-2xl border border-black/5 bg-white p-4 text-sm text-gray-500">
            {detail}
          </p>
        ) : null}
      </motion.section>
    </main>
  );
}
