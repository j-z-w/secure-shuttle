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
    <main className="min-h-screen bg-neutral-950 text-white px-6 py-24">
      <div className="max-w-2xl mx-auto mb-4">
        <BackButton fallbackHref="/dashboard" />
      </div>

      <div className="max-w-2xl mx-auto rounded-xl border border-neutral-800 bg-neutral-900 p-8 shadow-lg">
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
