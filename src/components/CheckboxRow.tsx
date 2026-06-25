import { Check } from 'lucide-react';

type CheckboxRowProps = {
  checked: boolean;
  label: string;
  onToggle: () => void;
};

export default function CheckboxRow({
  checked,
  label,
  onToggle,
}: CheckboxRowProps) {
  return (
    <button
      aria-checked={checked}
      className="focus-ring group flex w-full items-center gap-3 rounded-2xl border border-black/5 bg-paper px-4 py-3.5 text-left transition hover:border-black/10 hover:bg-white"
      onClick={onToggle}
      role="checkbox"
      type="button"
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition ${
          checked
            ? 'border-forest bg-forest text-white'
            : 'border-black/10 bg-white text-transparent group-hover:border-forest/30'
        }`}
      >
        <Check size={15} strokeWidth={3} />
      </span>
      <span
        className={`text-sm font-semibold transition sm:text-base ${
          checked ? 'text-ink' : 'text-gray-700'
        }`}
      >
        {label}
      </span>
    </button>
  );
}
