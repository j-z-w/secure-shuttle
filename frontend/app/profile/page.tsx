import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import BackButton from "@/app/components/BackButton";
import ProfileImageUpload from "@/app/components/ProfileImageUpload";

export default async function ProfilePage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/signin");
  }

  const user = await currentUser();

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

      <div className="relative z-10 max-w-2xl mx-auto rounded-2xl border border-neutral-800 bg-neutral-900/60 backdrop-blur p-6 sm:p-8 shadow-lg">
        <h1 className="text-3xl font-semibold mb-6">Profile</h1>

        <div className="flex items-center gap-4 mb-6">
          <ProfileImageUpload currentImageUrl={user?.imageUrl ?? ""} />
          <div>
            <p className="text-lg font-medium">{user?.fullName ?? "User"}</p>
            <p className="text-neutral-400 text-sm">
              {user?.primaryEmailAddress?.emailAddress}
            </p>
          </div>
        </div>

        <p className="text-neutral-300 text-sm">This is your profile page.</p>
      </div>
    </main>
  );
}
