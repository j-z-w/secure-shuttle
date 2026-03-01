"use client";

import { useState, useRef, useEffect } from "react";

type Message = {
  id: number;
  text: string;
  sender: "user" | "agent";
};

export default function ChatBox() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: "Hey! How can I help you today?", sender: "agent" },
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { id: Date.now(), text: input, sender: "user" }]);
    setInput("");
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {isOpen && (
        <div className="w-80 h-96 bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-blue-600 flex justify-between items-center">
            <span className="text-white font-semibold text-sm">Support</span>
            <button onClick={() => setIsOpen(false)} className="text-white cursor-pointer">✕</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${msg.sender === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"
            />
            <button onClick={sendMessage} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm cursor-pointer">↑</button>
          </div>
        </div>
      )}

      {/* Toggle */}
      <button
        onClick={() => setIsOpen((p) => !p)}
        className="w-12 h-12 bg-blue-600 rounded-full text-white text-xl shadow-lg cursor-pointer"
      >
        {isOpen ? "✕" : "O"}
      </button>
    </div>
  );
}