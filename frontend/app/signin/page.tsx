import Image from "next/image";
import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/");
  }

  return (
    <main className="min-h-screen flex flex-col md:flex-row">
      {/* Left Side */}
      <section className="md:basis-3/5 flex-1 flex flex-col justify-center items-center bg-[#1d1d1d] text-white p-10 relative">
        <div className="max-w-md w-full">
          <div className="mb-8 flex items-center gap-3">
            <Image
              src="/logo.webp"
              alt="Logo"
              width={500}
              height={500}
              className="rounded"
              priority
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            Welcome!
          </h1>
          <p className="text-lg opacity-90 mb-12">Pay for things your way.</p>
        </div>
      </section>

      {/* Right Side */}
      <section className="md:basis-2/5 flex-1 flex flex-col justify-center items-center bg-white p-10 shadow-lg">
        <SignIn routing="hash" forceRedirectUrl="/" />
      </section>
    </main>
  );
}
