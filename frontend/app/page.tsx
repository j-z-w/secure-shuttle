// import Image from "next/image";
// export default function Home() {
//   return <main className="min-h-screen bg-black"></main>;
// }
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center py-32 px-6">
        <h1 className="text-5xl font-bold tracking-tight">
          Secure Shuttle Payments
        </h1>
        <p className="mt-6 text-lg text-neutral-400 max-w-xl">
          Fast, secure, and reliable payment processing built for modern
          transportation systems.
        </p>

        <Link
          href="/pay"
          className="mt-8 bg-blue-600 hover:bg-blue-700 transition px-6 py-3 rounded-lg text-lg font-medium"
        >
          Make a Payment
        </Link>
      </section>

      {/* Features Section */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-neutral-900 p-6 rounded-xl">
            <h3 className="text-xl font-semibold">Secure</h3>
            <p className="mt-2 text-neutral-400">
              End-to-end encrypted transactions with fraud protection.
            </p>
          </div>

          <div className="bg-neutral-900 p-6 rounded-xl">
            <h3 className="text-xl font-semibold">Fast</h3>
            <p className="mt-2 text-neutral-400">
              Process payments in seconds with real-time confirmations.
            </p>
          </div>

          <div className="bg-neutral-900 p-6 rounded-xl">
            <h3 className="text-xl font-semibold">Reliable</h3>
            <p className="mt-2 text-neutral-400">
              Built for high-traffic environments like campus transport systems.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
