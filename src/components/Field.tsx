export function Field({
  label,
  value,
  onChange,
  min = 0,
  max = 999,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <label className="field">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        step="1"
        value={value}
        onChange={(e) =>
          onChange(e.target.value === "" ? min : Number(e.target.value))
        }
      />
    </label>
  );
}
