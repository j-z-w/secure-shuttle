"use client";

import { useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";

export default function ProfileImageUpload({
  currentImageUrl,
}: {
  currentImageUrl: string;
}) {
  const { user } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Show local preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    setUploading(true);
    try {
      await user.setProfileImage({ file });
    } catch (err) {
      console.error("Failed to upload profile image:", err);
      setPreview(null); // revert on failure
    } finally {
      setUploading(false);
    }
  }

  const displayUrl = preview ?? currentImageUrl;

  return (
    <button
      type="button"
      onClick={() => fileInputRef.current?.click()}
      className="relative group h-16 w-16 rounded-full shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-neutral-900"
      aria-label="Change profile picture"
    >
      {/* Profile image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={displayUrl}
        alt="Profile"
        className={`h-16 w-16 rounded-full object-cover bg-neutral-800 transition-opacity ${
          uploading ? "opacity-50" : "group-hover:opacity-70"
        }`}
      />

      {/* Plus icon overlay */}
      <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icon-plus.webp"
          alt="Add photo"
          className="h-7 w-7 drop-shadow-lg"
        />
      </span>

      {/* Uploading spinner */}
      {uploading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="h-6 w-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </span>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </button>
  );
}
