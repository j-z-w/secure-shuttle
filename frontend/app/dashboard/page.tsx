"use client";
import React, { useState } from "react";

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Top Bar */}
      <header className="w-full flex items-center justify-between bg-gray-800 px-6 py-4 shadow-md z-10 relative">
        <div className="flex-1 flex justify-center">
          <a
            href="/"
            aria-label="Home"
            className="flex items-center justify-center"
          >
            <img
              src="/logo.webp"
              alt="Logo"
              width={500}
              height={500}
              className="w-54 h-64 object-contain"
            />
          </a>
        </div>
        <a
          href="/newEscrow"
          className="absolute right-6 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded transition"
        >
          + New Escrow
        </a>
      </header>
      {/* Sidebar */}
      <aside
        className={`z-20 fixed top-0 left-0 h-screen bg-gray-800 transition-all duration-300 flex-shrink-0 p-6 ${
          sidebarOpen ? "w-64" : "w-16"
        }`}
      >
        <div className="flex items-center gap-2 mb-8">
          <button
            className="text-gray-400 hover:text-white focus:outline-none"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label="Toggle sidebar"
          >
            {/* Hamburger icon */}
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
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
            <span className="text-2xl font-bold tracking-tight">User</span>
          )}
        </div>
        <nav className="space-y-2">
          {sidebarOpen && (
            <div className="text-gray-400 uppercase text-xs mb-2">
              Dashboards
            </div>
          )}
          <a
            href="#"
            className={`block py-2 px-3 rounded font-semibold ${sidebarOpen ? "bg-gray-700" : "bg-gray-700 text-center"}`}
          >
            Overview
          </a>
          {sidebarOpen && (
            <div className="text-gray-400 uppercase text-xs mt-6 mb-2">
              Pages
            </div>
          )}
          <a
            href="#"
            className={`block py-2 px-3 rounded hover:bg-gray-700 ${sidebarOpen ? "" : "text-center"}`}
          >
            {sidebarOpen ? "User Profile" : "U"}
          </a>
          <a
            href="#"
            className={`block py-2 px-3 rounded hover:bg-gray-700 ${sidebarOpen ? "" : "text-center"}`}
          >
            {sidebarOpen ? "Account" : "A"}
          </a>
          <a
            href="#"
            className={`block py-2 px-3 rounded hover:bg-gray-700 ${sidebarOpen ? "" : "text-center"}`}
          >
            {sidebarOpen ? "Settings" : "C"}
          </a>
          <a
            href="#"
            className={`block py-2 px-3 rounded hover:bg-gray-700 ${sidebarOpen ? "" : "text-center"}`}
          >
            {sidebarOpen ? "Blog" : "B"}
          </a>
          <a
            href="#"
            className={`block py-2 px-3 rounded hover:bg-gray-700 ${sidebarOpen ? "" : "text-center"}`}
          >
            {sidebarOpen ? "Social" : "S"}
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 transition-all duration-300 p-6 ${
          sidebarOpen ? "md:ml-64" : "md:ml-16"
        }`}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-gray-800 rounded-lg p-6 flex flex-col items-center">
            <div className="text-2xl font-bold">7,265</div>
            <div className="text-gray-400">Views</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 flex flex-col items-center">
            <div className="text-2xl font-bold">3,671</div>
            <div className="text-gray-400">Visits</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 flex flex-col items-center">
            <div className="text-2xl font-bold">256</div>
            <div className="text-gray-400">New Users</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 flex flex-col items-center">
            <div className="text-2xl font-bold">2,318</div>
            <div className="text-gray-400">Active Users</div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gray-800 rounded-lg p-6 col-span-2">
            <div className="font-semibold mb-2">Total Users</div>
            <div className="h-40 flex items-center justify-center text-gray-500">
              [Line Chart]
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="font-semibold mb-2">Traffic by Website</div>
            <ul className="text-gray-400 space-y-1">
              <li>Google</li>
              <li>YouTube</li>
              <li>Instagram</li>
              <li>Pinterest</li>
              <li>Facebook</li>
              <li>Twitter</li>
            </ul>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="font-semibold mb-2">Traffic by Device</div>
            <div className="h-32 flex items-center justify-center text-gray-500">
              [Bar Chart]
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="font-semibold mb-2">Traffic by Location</div>
            <div className="h-32 flex items-center justify-center text-gray-500">
              [Pie Chart]
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="font-semibold mb-2">Marketing & SEO</div>
            <div className="h-32 flex items-center justify-center text-gray-500">
              [Content]
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
