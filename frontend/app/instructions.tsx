"use client";

import { useState, useCallback } from "react";

const items = [
  {
    image: "/inst1.png",
    title: "Create an Escrow",
    text: "Start by creating an escrow. Enter a label to describe the transaction and set the amount in SOL. You'll get a shareable link to send to the other party.",
  },
  {
    image: "/inst2.png",
    title: "Claim Roles & Fund",
    text: "Once both parties have claimed their roles, the sender's workspace shows the full transaction progress, a payment QR code, and the escrow wallet address to send funds to.",
  },
  {
    image: "/inst3.png",
    title: "Track & Release",
    text: "Track your transaction in real time as funds are confirmed on-chain. Once the service has been provided, the sender can release the funds to the recipient with a single click.",
  },
  {
    image: "/inst4.png",
    title: "Resolve Disputes",
    text: "If something goes wrong, either party can open a dispute with an optional reason. An admin will review the case and settle the escrow by refunding the sender or paying out the recipient.",
  },
];

export default function Slideshow() {
  const [current, setCurrent] = useState(0);

  const prev = useCallback(
    () => setCurrent((i) => (i === 0 ? items.length - 1 : i - 1)),
    [],
  );
  const next = useCallback(
    () => setCurrent((i) => (i === items.length - 1 ? 0 : i + 1)),
    [],
  );

  return (
    <div className="flex flex-col lg:flex-row w-full min-h-screen items-center justify-center gap-8 lg:gap-14 px-6 sm:px-12 lg:px-20 py-16 lg:py-0">
      {/* Image side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center">
        <div className="relative rounded-2xl overflow-hidden border border-neutral-700/60 shadow-[0_0_60px_rgba(99,102,241,0.08)] bg-neutral-900/30 backdrop-blur-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={items[current].image}
            alt={`Step ${current + 1}: ${items[current].title}`}
            className="max-h-[50vh] lg:max-h-[70vh] w-auto object-contain"
          />
        </div>
      </div>

      {/* Text side */}
      <div className="w-full lg:w-1/2 flex flex-col items-center lg:items-start justify-center gap-6 max-w-xl">
        {/* Step badge */}
        <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300 uppercase tracking-wider">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
          Step {current + 1} of {items.length}
        </span>

        <h3 className="text-2xl sm:text-3xl font-bold text-white text-center lg:text-left">
          {items[current].title}
        </h3>

        <p className="text-neutral-300 text-base sm:text-lg leading-relaxed text-center lg:text-left">
          {items[current].text}
        </p>

        {/* Navigation arrows */}
        <div className="flex items-center gap-4 mt-2">
          <button
            onClick={prev}
            className="hover:scale-110 transition-transform cursor-pointer bg-transparent border-none p-0"
            aria-label="Previous step"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/leftarrow.svg" alt="Previous" className="h-10 w-10" />
          </button>

          {/* Dots */}
          <div className="flex gap-2">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className="cursor-pointer p-0 border-none bg-transparent"
                aria-label={`Go to step ${i + 1}`}
              >
                <span
                  className={`block rounded-full transition-all duration-300 ${
                    i === current
                      ? "w-6 h-2 bg-indigo-400"
                      : "w-2 h-2 bg-neutral-600 hover:bg-neutral-400"
                  }`}
                />
              </button>
            ))}
          </div>

          <button
            onClick={next}
            className="hover:scale-110 transition-transform cursor-pointer bg-transparent border-none p-0"
            aria-label="Next step"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/rightarrow.svg" alt="Next" className="h-10 w-10" />
          </button>
        </div>
      </div>
    </div>
  );
}