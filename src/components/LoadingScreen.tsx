import { motion } from 'framer-motion';

export default function LoadingScreen() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-paper px-6 text-ink">
      <div className="minecraft-pattern pointer-events-none absolute inset-0" />
      <motion.div
        animate={{ opacity: [0.35, 1, 0.35] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        className="h-2 w-28 rounded-full bg-ink/10"
      />
    </main>
  );
}
