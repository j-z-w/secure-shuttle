"use client";
import React, { useState } from "react";

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Top Bar */}
      <header className="w-full bg-gray-800 shadow-md z-10 relative flex items-center px-6 py-3">
        {/* Logo — absolutely centered across the full header width */}
        <div className="absolute inset-x-0 flex justify-center pointer-events-none">
          <a href="/" aria-label="Home" className="pointer-events-auto">
            <img
              src="/logo.webp"
              alt="Logo"
              className="h-10 w-auto object-contain"
            />
          </a>
        </div>

        {/* New Escrow button — pinned to the right with ml-auto */}
        <a
          href="/newEscrow"
          className="ml-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded transition relative z-10"
        >
          + New Escrow
        </a>
      </header>

      {/* Sidebar */}
      <aside
        className={`z-20 fixed top-0 left-0 h-screen bg-gray-800 transition-all duration-300 flex-shrink-0 p-4 ${
          sidebarOpen ? "w-64" : "w-16"
        }`}
      >
        <div className="flex items-center gap-2 mb-6">
          <button
            className="text-gray-400 hover:text-white focus:outline-none"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label="Toggle sidebar"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          {sidebarOpen && (
            <span className="text-lg font-bold tracking-tight truncate">
              My Account
            </span>
          )}
        </div>

        <nav className="space-y-1">
          {sidebarOpen && (
            <div className="text-gray-400 uppercase text-xs mb-2 px-3">
              Dashboards
            </div>
          )}
          <a
            href="#"
            className={`flex items-center gap-3 py-2 px-3 rounded font-semibold bg-gray-700 ${!sidebarOpen && "justify-center"}`}
          >
            <img
              src="/icons-overview.webp"
              alt="Overview"
              className="w-4 h-4 shrink-0 object-contain"
            />
            {sidebarOpen && "Overview"}
          </a>

          {sidebarOpen && (
            <div className="text-gray-400 uppercase text-xs mt-5 mb-2 px-3">
              Escrow
            </div>
          )}
          <a
            href="/newEscrow"
            className={`flex items-center gap-3 py-2 px-3 rounded hover:bg-gray-700 ${!sidebarOpen && "justify-center"}`}
          >
            <img
              src="/icons-escrow.webp"
              alt="New Escrow"
              className="w-4 h-4 shrink-0 object-contain"
            />
            {sidebarOpen && "New Escrow"}
          </a>
          <a
            href="#"
            className={`flex items-center gap-3 py-2 px-3 rounded hover:bg-gray-700 ${!sidebarOpen && "justify-center"}`}
          >
            <img
              src="/icons-escrow.webp"
              alt="Active Escrows"
              className="w-4 h-4 shrink-0 object-contain"
            />
            {sidebarOpen && "Active Escrows"}
          </a>
          <a
            href="#"
            className={`flex items-center gap-3 py-2 px-3 rounded hover:bg-gray-700 ${!sidebarOpen && "justify-center"}`}
          >
            <img
              src="/icons-escrow.webp"
              alt="Escrow History"
              className="w-4 h-4 shrink-0 object-contain"
            />
            {sidebarOpen && "Escrow History"}
          </a>

          {sidebarOpen && (
            <div className="text-gray-400 uppercase text-xs mt-5 mb-2 px-3">
              Account
            </div>
          )}
          <a
            href="#"
            className={`flex items-center gap-3 py-2 px-3 rounded hover:bg-gray-700 ${!sidebarOpen && "justify-center"}`}
          >
            <img
              src="/icons-user.webp"
              alt="User Profile"
              className="w-4 h-4 shrink-0 object-contain"
            />
            {sidebarOpen && "User Profile"}
          </a>
          <a
            href="#"
            className={`flex items-center gap-3 py-2 px-3 rounded hover:bg-gray-700 ${!sidebarOpen && "justify-center"}`}
          >
            <img
              src="/icons-settings.webp"
              alt="Settings"
              className="w-4 h-4 shrink-0 object-contain"
            />
            {sidebarOpen && "Settings"}
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 transition-all duration-300 p-6 pt-4 ${
          sidebarOpen ? "md:ml-64" : "md:ml-16"
        }`}
      >
        {/* Page Title */}
        <h1 className="text-xl font-bold mb-4 text-gray-100">
          Dashboard Overview
        </h1>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <div className="bg-gray-800 rounded-lg p-4 flex flex-col">
            <div className="text-gray-400 text-xs uppercase mb-1">
              Available Balance
            </div>
            <div className="text-2xl font-bold text-green-400">$0.00</div>
            <div className="text-gray-500 text-xs mt-1">Ready to withdraw</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 flex flex-col">
            <div className="text-gray-400 text-xs uppercase mb-1">
              Pending in Escrow
            </div>
            <div className="text-2xl font-bold text-yellow-400">$0.00</div>
            <div className="text-gray-500 text-xs mt-1">Awaiting release</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 flex flex-col">
            <div className="text-gray-400 text-xs uppercase mb-1">
              Active Escrows
            </div>
            <div className="text-2xl font-bold text-blue-400">0</div>
            <div className="text-gray-500 text-xs mt-1">In progress</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 flex flex-col">
            <div className="text-gray-400 text-xs uppercase mb-1">
              Completed
            </div>
            <div className="text-2xl font-bold text-gray-100">0</div>
            <div className="text-gray-500 text-xs mt-1">All time</div>
          </div>
        </div>

        {/* Balance chart + Active escrows */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
          <div className="bg-gray-800 rounded-lg p-5 col-span-2">
            <div className="font-semibold mb-1 text-gray-200">
              Transaction History
            </div>
            <div className="text-xs text-gray-500 mb-3">Balance over time</div>
            <div className="h-36 flex items-center justify-center text-gray-500 border border-dashed border-gray-700 rounded">
              [Balance Chart]
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-5">
            <div className="font-semibold mb-1 text-gray-200">
              Active Escrows
            </div>
            <div className="text-xs text-gray-500 mb-3">
              Currently in progress
            </div>
            <div className="h-36 flex items-center justify-center text-gray-500 border border-dashed border-gray-700 rounded">
              No active escrows
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-gray-800 rounded-lg p-5">
            <div className="font-semibold mb-1 text-gray-200">Dispute Rate</div>
            <div className="text-xs text-gray-500 mb-3">
              Escrows flagged for dispute
            </div>
            <div className="h-28 flex items-center justify-center text-gray-500 border border-dashed border-gray-700 rounded">
              [Chart]
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-5">
            <div className="font-semibold mb-1 text-gray-200">
              Counterparties
            </div>
            <div className="text-xs text-gray-500 mb-3">
              Buyers & sellers by region
            </div>
            <div className="h-28 flex items-center justify-center text-gray-500 border border-dashed border-gray-700 rounded">
              [Map / Pie Chart]
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-5">
            <div className="font-semibold mb-1 text-gray-200">
              Recent Activity
            </div>
            <div className="text-xs text-gray-500 mb-3">
              Latest escrow events
            </div>
            <div className="h-28 flex items-center justify-center text-gray-500 border border-dashed border-gray-700 rounded">
              No recent activity
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
