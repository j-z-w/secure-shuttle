"use client";

import { useState } from "react";

const items = [
  {
    image: "/inst1.png",
    text: "Start by creating an escrow. Enter a label to describe the transaction and set the amount in SOL. You'll get a shareable link to send to the other party.",
  },
  {
    image: "/inst2.png",
    text: "Once both parties have claimed their roles, the sender's workspace shows the full transaction progress, a payment QR code, and the escrow wallet address to send funds to.",
  },
  {
    image: "/inst3.png",
    text: "Track your transaction in real time as funds are confirmed on-chain. Once the service has been provided, the sender can release the funds to the recipient with a single click.",
  },
  {
    image: "/inst4.png",
    text: "If something goes wrong, either party can open a dispute with an optional reason. An admin will review the case and settle the escrow by refunding the sender or paying out the recipient.",
  },
];

export default function Slideshow() {
  const [current, setCurrent] = useState(0);

  const prev = () => setCurrent((i) => (i === 0 ? items.length - 1 : i - 1));
  const next = () => setCurrent((i) => (i === items.length - 1 ? 0 : i + 1));

  return (
    <div className="flex w-full" style={{ height: "100vh" }}>
      {/* Image side */}
      <div className="w-1/2 h-full flex items-center justify-center">
        <img
            src={items[current].image}
            alt={`inst ${current + 1}`}
            style={{ 
                maxHeight: "80%", 
                maxWidth: "90%", 
                objectFit: "contain",
                border: "2px solid white",
                borderRadius: "8px",
            }}
        />
      </div>

      {/* Text side */}
      <div className="w-1/2 h-full flex flex-col items-center justify-center px-16 gap-8">
        <p className="text-white text-xl leading-relaxed text-center">
          {items[current].text}
        </p>

        {/* Navigation */}
        <div className="flex items-center gap-6">
          <button onClick={prev} className="text-white text-3xl cursor-pointer hover:opacity-70">←</button>
          <span className="text-neutral-400 text-sm">{current + 1} / {items.length}</span>
          <button onClick={next} className="text-white text-3xl cursor-pointer hover:opacity-70">→</button>
        </div>

        {/* Dots */}
        <div className="flex gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className="cursor-pointer"
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: i === current ? "#fff" : "#555",
                border: "none",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}