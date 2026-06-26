import { LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

type ShellHeaderProps = {
  dateLabel: string;
  onSignOut: () => void;
  rolloverLabel: string;
  summerLabel: string;
};

export default function ShellHeader({
  dateLabel,
  onSignOut,
  rolloverLabel,
  summerLabel,
}: ShellHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      className="sticky top-0 z-30 border-b border-black/5 bg-white/75 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xl font-extrabold leading-none">
              Rayzk<span className="text-forest">.</span>
            </div>
            <div className="mt-1 text-sm font-medium capitalize text-gray-500">
              {dateLabel}
            </div>
          </div>
          <button
            aria-label="Se déconnecter"
            className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/5 bg-paper text-ink transition hover:border-black/10 hover:bg-white md:hidden"
            onClick={onSignOut}
            title="Se déconnecter"
            type="button"
          >
            <LogOut size={17} />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <div className="rounded-full border border-black/5 bg-paper px-4 py-2 text-sm font-bold text-ink">
              {summerLabel}
            </div>
            <div className="rounded-full border border-black/5 bg-white px-3 py-2 text-xs font-bold text-gray-500">
              {rolloverLabel}
            </div>
          </div>
          <button
            aria-label="Se déconnecter"
            className="focus-ring hidden h-10 w-10 items-center justify-center rounded-full border border-black/5 bg-paper text-ink transition hover:border-black/10 hover:bg-white md:inline-flex"
            onClick={onSignOut}
            title="Se déconnecter"
            type="button"
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </motion.header>
  );
}
