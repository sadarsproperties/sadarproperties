interface EditableCellProps {
  value: string;
  onSave: (value: string) => void;
  type?: 'text' | 'number' | 'email' | 'url';
}

export function EditableCell({ value, onSave, type = 'text' }: EditableCellProps) {
  return (
    <input
      type={type}
      defaultValue={value}
      onBlur={(event) => {
        if (event.target.value !== value) onSave(event.target.value);
      }}
      className="w-full min-w-[120px] rounded-md border border-transparent bg-transparent px-2 py-1 text-sm outline-none focus:border-sky-500 focus:bg-slate-950"
    />
  );
}