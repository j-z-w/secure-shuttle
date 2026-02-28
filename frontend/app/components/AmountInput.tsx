"use client";

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}

export default function AmountInput({ value, onChange, error }: AmountInputProps) {
  const numericValue = parseFloat(value);
  const lamports = !isNaN(numericValue) && numericValue > 0
    ? Math.round(numericValue * 1_000_000_000)
    : 0;

  return (
    <div>
      <label className="block text-sm text-neutral-400 mb-1.5">Amount</label>
      <div className="flex">
        <input
          type="number"
          step="any"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0.00"
          className={`flex-1 bg-neutral-800 border rounded-l-lg px-4 py-3 text-white placeholder-neutral-500 outline-none transition-colors font-[family-name:var(--font-geist-mono)] ${
            error
              ? "border-red-500 focus:border-red-500"
              : "border-neutral-700 focus:border-[#0070f3]"
          }`}
        />
        <span className="bg-neutral-700 text-neutral-300 px-4 py-3 rounded-r-lg border border-l-0 border-neutral-700 text-sm font-medium flex items-center">
          SOL
        </span>
      </div>
      {error ? (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      ) : (
        <p className="mt-1 text-xs font-[family-name:var(--font-geist-mono)] text-neutral-500">
          = {lamports.toLocaleString()} lamports
        </p>
      )}
    </div>
  );
}
