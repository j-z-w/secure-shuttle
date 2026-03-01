import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ProfileContent from "./profile-content";

export default async function ProfilePage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/signin");
  }

  const user = await currentUser();

  return (
    <ProfileContent
      fullName={user?.fullName ?? "User"}
      email={user?.primaryEmailAddress?.emailAddress ?? ""}
      imageUrl={user?.imageUrl ?? "/userpfp.jpg"}
    />
  );
}
