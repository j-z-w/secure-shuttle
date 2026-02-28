"use client";

import { useState } from "react";

const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

interface AddressInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function AddressInput({
  label,
  value,
  onChange,
  placeholder = "e.g. 9xA3bK…",
}: AddressInputProps) {
  const [touched, setTouched] = useState(false);

  const isValid = SOLANA_ADDRESS_REGEX.test(value.trim());
  const showError = touched && value.length > 0 && !isValid;
  const showValid = touched && value.length > 0 && isValid;

  return (
    <div>
      <label className="block text-sm text-neutral-400 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder={placeholder}
          spellCheck={false}
          className={`w-full font-[family-name:var(--font-geist-mono)] text-sm bg-neutral-800 border rounded-lg px-4 py-3 text-white placeholder-neutral-500 outline-none transition-colors ${
            showError
              ? "border-red-500 focus:border-red-500"
              : showValid
              ? "border-green-600 focus:border-green-600"
              : "border-neutral-700 focus:border-[#0070f3]"
          }`}
        />
        {showValid && (
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      {showError && (
        <p className="mt-1 text-sm text-red-400">
          Invalid address — must be 32-44 base58 characters
        </p>
      )}
      {!touched && (
        <p className="mt-1 text-xs text-neutral-500">
          Solana addresses are 32-44 characters, base58 encoded
        </p>
      )}
    </div>
  );
}
