import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import BackButton from "@/app/components/BackButton";
import CopyButton from "@/app/components/CopyButton";
import ProfileImageUpload from "@/app/components/ProfileImageUpload";

function formatDate(value?: Date | null) {
  if (!value) return "—";
  return value.toLocaleString();
}

function formatRole(role: unknown) {
  if (typeof role !== "string" || role.trim().length === 0) return "User";
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

function shortId(id: string) {
  if (id.length <= 16) return id;
  return `${id.slice(0, 8)}...${id.slice(-6)}`;
}

export default async function ProfilePage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/signin");
  }

  const user = await currentUser();
  const role = formatRole(user?.publicMetadata?.role);
  const primaryEmail = user?.primaryEmailAddress?.emailAddress ?? "Not set";
  const fullName = user?.fullName || user?.username || "SecureShuttle User";
  const accountCreated = formatDate(user?.createdAt ?? null);
  const lastSignIn = formatDate(user?.lastSignInAt ?? null);
  const userIdentifier = user?.id ?? "";

  return (
    <main className="relative min-h-screen text-white px-4 sm:px-6 py-16 sm:py-24">
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: "url('/backgroundStars.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div className="relative z-10 max-w-2xl mx-auto mb-4">
        <BackButton fallbackHref="/dashboard" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto space-y-5">
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/60 backdrop-blur p-6 sm:p-8 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <ProfileImageUpload currentImageUrl={user?.imageUrl ?? ""} />
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold">{fullName}</h1>
                <p className="text-neutral-400 text-sm sm:text-base">{primaryEmail}</p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
                  <span className="h-2 w-2 rounded-full bg-indigo-400" />
                  {role}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm min-w-[220px]">
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 py-2">
                <p className="text-neutral-400 text-xs uppercase tracking-wide">Account</p>
                <p className="text-white font-medium">Active</p>
              </div>
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 py-2">
                <p className="text-neutral-400 text-xs uppercase tracking-wide">2FA</p>
                <p className="text-white font-medium">
                  {user?.twoFactorEnabled ? "Enabled" : "Disabled"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 backdrop-blur p-5">
            <h2 className="text-lg font-semibold mb-4">Account Details</h2>
            <div className="space-y-3">
              <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 px-4 py-3">
                <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">User ID</p>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-sm text-neutral-200">{shortId(userIdentifier)}</p>
                  {userIdentifier ? <CopyButton value={userIdentifier} /> : null}
                </div>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 px-4 py-3">
                <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Email</p>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-neutral-200 break-all">{primaryEmail}</p>
                  {primaryEmail !== "Not set" ? <CopyButton value={primaryEmail} /> : null}
                </div>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 px-4 py-3">
                <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Username</p>
                <p className="text-sm text-neutral-200">{user?.username ?? "Not set"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 backdrop-blur p-5">
            <h2 className="text-lg font-semibold mb-4">Activity & Security</h2>
            <div className="space-y-3">
              <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 px-4 py-3">
                <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Account created</p>
                <p className="text-sm text-neutral-200">{accountCreated}</p>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 px-4 py-3">
                <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Last sign-in</p>
                <p className="text-sm text-neutral-200">{lastSignIn}</p>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 px-4 py-3">
                <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Email verification</p>
                <p className="text-sm text-neutral-200">
                  {user?.primaryEmailAddress?.verification?.status === "verified"
                    ? "Verified"
                    : "Unverified"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/60 backdrop-blur p-5">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl border border-neutral-700 bg-neutral-900/60 px-4 py-3 text-sm font-medium text-neutral-200 hover:text-white hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-colors"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/escrows"
              className="rounded-xl border border-neutral-700 bg-neutral-900/60 px-4 py-3 text-sm font-medium text-neutral-200 hover:text-white hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-colors"
            >
              View Escrows
            </Link>
            <Link
              href="/newEscrow"
              className="rounded-xl border border-neutral-700 bg-neutral-900/60 px-4 py-3 text-sm font-medium text-neutral-200 hover:text-white hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-colors"
            >
              Create Escrow
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
