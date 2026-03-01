"use client";

import { useEffect, useMemo, useState } from "react";

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}

const SOL_USD_CACHE_KEY = "ss_sol_usd_rate_v1";
const SOL_USD_CACHE_TTL_MS = 30 * 60 * 1000;

function readCachedSolUsdRate(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SOL_USD_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { rate?: number; fetchedAt?: number };
    if (
      typeof parsed.rate !== "number" ||
      !Number.isFinite(parsed.rate) ||
      typeof parsed.fetchedAt !== "number"
    ) {
      return null;
    }
    const age = Date.now() - parsed.fetchedAt;
    if (age > SOL_USD_CACHE_TTL_MS) return null;
    return parsed.rate;
  } catch {
    return null;
  }
}

function writeCachedSolUsdRate(rate: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      SOL_USD_CACHE_KEY,
      JSON.stringify({ rate, fetchedAt: Date.now() })
    );
  } catch {
    // Ignore storage quota/privacy mode errors.
  }
}

export default function AmountInput({ value, onChange, error }: AmountInputProps) {
  const [solUsdRate, setSolUsdRate] = useState<number | null>(null);
  const [rateLoading, setRateLoading] = useState(false);

  const numericValue = parseFloat(value);
  const validSolAmount = !Number.isNaN(numericValue) && numericValue > 0 ? numericValue : 0;

  useEffect(() => {
    const cached = readCachedSolUsdRate();
    if (cached) {
      setSolUsdRate(cached);
      return;
    }

    const controller = new AbortController();
    let active = true;

    async function loadRate() {
      setRateLoading(true);
      try {
        const res = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const body = (await res.json()) as { solana?: { usd?: number } };
        const rate = body.solana?.usd;
        if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) {
          writeCachedSolUsdRate(rate);
          if (active) setSolUsdRate(rate);
        }
      } catch {
        // Best-effort estimate only.
      } finally {
        if (active) setRateLoading(false);
      }
    }

    void loadRate();
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const usdEstimate = useMemo(() => {
    if (!solUsdRate || validSolAmount <= 0) return null;
    return validSolAmount * solUsdRate;
  }, [solUsdRate, validSolAmount]);

  const usdEstimateLabel = useMemo(() => {
    if (validSolAmount <= 0) return "Enter amount to see USD estimate";
    if (usdEstimate == null) {
      return rateLoading ? "Fetching SOL price..." : "USD estimate unavailable";
    }
    return `≈ ${usdEstimate.toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }, [rateLoading, usdEstimate, validSolAmount]);

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
          {usdEstimateLabel}
        </p>
      )}
    </div>
  );
}
