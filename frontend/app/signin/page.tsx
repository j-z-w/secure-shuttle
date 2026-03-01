import Image from "next/image";
import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function SignInPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/");
  }

  return (
    <main className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
      {/* Background — same as homepage */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: "url('/backgroundStars.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-10 px-6 py-16 w-full max-w-md">
        {/* Logo */}
        <a href="/" className="hover:scale-105 transition-transform">
          <Image
            src="/logo.webp"
            alt="Secure Shuttle"
            width={220}
            height={220}
            className="rounded drop-shadow-[0_0_60px_rgba(99,102,241,0.25)]"
            priority
          />
        </a>

        {/* Heading */}
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-2">
            Welcome back
          </h1>
          <p className="text-neutral-400 text-base">
            Sign in to continue to SecureShuttle
          </p>
        </div>

        {/* Clerk Sign-In */}
        <div className="w-full flex justify-center">
          <SignIn
            routing="hash"
            forceRedirectUrl="/"
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "bg-neutral-900/80 backdrop-blur border border-neutral-800 shadow-2xl rounded-2xl",
                headerTitle: "text-white",
                headerSubtitle: "text-neutral-400",
                formFieldLabel: "text-neutral-300",
                formFieldInput:
                  "bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500 focus:border-indigo-500",
                formButtonPrimary:
                  "bg-indigo-600 hover:bg-indigo-500 transition-colors",
                footerActionLink: "text-indigo-400 hover:text-indigo-300",
                socialButtonsBlockButton:
                  "bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-700",
                dividerLine: "bg-neutral-700",
                dividerText: "text-neutral-500",
              },
            }}
          />
        </div>
      </div>
    </main>
  );
}
