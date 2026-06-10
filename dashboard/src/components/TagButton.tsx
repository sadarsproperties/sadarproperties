interface TagButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  tone?: 'blue' | 'amber' | 'green';
}

const tones = {
  blue: 'border-sky-500/50 bg-sky-500/20 text-sky-100',
  amber: 'border-amber-500/50 bg-amber-500/20 text-amber-100',
  green: 'border-emerald-500/50 bg-emerald-500/20 text-emerald-100',
};

export function TagButton({ label, active, onClick, tone = 'blue' }: TagButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
        active
          ? tones[tone]
          : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500'
      }`}
    >
      {label}
    </button>
  );
}