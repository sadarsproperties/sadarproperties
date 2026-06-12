import React, { useState } from 'react';

interface Field {
  key: string;
  label: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
}

interface PromptModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  fields: Field[];
  submitText?: string;
  onSubmit: (data: Record<string, string>) => void;
  onCancel: () => void;
}

export default function PromptModal({
  isOpen,
  title,
  description,
  fields,
  submitText = 'Submit',
  onSubmit,
  onCancel
}: PromptModalProps) {
  const [values, setValues] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (isOpen) {
      const initial: Record<string, string> = {};
      fields.forEach(f => {
        initial[f.key] = f.defaultValue || '';
      });
      setValues(initial);
    }
  }, [isOpen, fields]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  const getIcon = () => {
    const t = title.toLowerCase();
    if (t.includes('buyer')) return '💼';
    if (t.includes('investor')) return '⚜️';
    if (t.includes('ai') || t.includes('extraction')) return '🤖';
    return '📝';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
      <div 
        className="w-full max-w-md transform rounded-3xl border border-white/20 bg-white/95 p-6 shadow-2xl transition-all duration-300 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1A3C34]/10 text-2xl">
            {getIcon()}
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#1A3C34]">{title}</h3>
            {description && <p className="text-xs text-[#6B7280]">{description}</p>}
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="mt-6">
          <div className="max-h-[55vh] overflow-y-auto pr-2 space-y-4">
            {fields.map((field) => (
              <div key={field.key} className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#8A8A8A] uppercase tracking-wider">
                  {field.label}
                </label>
                <input
                  type={field.type || 'text'}
                  placeholder={field.placeholder}
                  value={values[field.key] || ''}
                  onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
                  className="w-full rounded-2xl border border-black/10 px-4 py-3 text-sm transition focus:border-[#1A3C34] focus:ring-1 focus:ring-[#1A3C34] focus:outline-none bg-[#F9F6F1]/50 focus:bg-white"
                  required={field.defaultValue === undefined && (field.key === 'fullName' || field.key === 'investorName')}
                />
              </div>
            ))}
          </div>
          
          <div className="mt-8 flex justify-end gap-3 border-t border-black/5 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-2xl border border-black/10 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-black/5 active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-2xl bg-[#1A3C34] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#122A24] active:scale-95 transition-all shadow-md shadow-[#1A3C34]/20"
            >
              {submitText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
