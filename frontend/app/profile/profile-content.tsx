"use client";

import { useState } from "react";

type ProfileContentProps = {
  fullName: string;
  email: string;
  imageUrl: string;
};

export default function ProfileContent({
  fullName,
  email,
  imageUrl,
}: ProfileContentProps) {
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
            href="/dashboard"
            className={`flex items-center gap-3 py-2 px-3 rounded hover:bg-gray-700 ${!sidebarOpen && "justify-center"}`}
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
            href="/profile"
            className={`flex items-center gap-3 py-2 px-3 rounded font-semibold bg-gray-700 ${!sidebarOpen && "justify-center"}`}
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
        <h1 className="text-xl font-bold mb-4 text-gray-100">Profile</h1>

        <div className="max-w-2xl rounded-xl border border-neutral-800 bg-neutral-900 p-8 shadow-lg">
          <div className="flex items-center gap-4 mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Profile"
              className="h-16 w-16 rounded-full object-cover bg-neutral-800"
            />
            <div>
              <p className="text-lg font-medium">{fullName}</p>
              <p className="text-neutral-400 text-sm">{email}</p>
            </div>
          </div>

          <p className="text-neutral-300 text-sm">This is your profile page.</p>
        </div>
      </main>
    </div>
  );
}
