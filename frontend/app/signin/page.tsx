import Image from "next/image";

export default function Home() {
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
        <div className="max-w-sm w-full">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">Sign In</h2>

          <form className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              defaultValue=""
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              type="submit"
              className="w-full py-2 bg-black text-white rounded font-semibold hover:bg-gray-800 transition"
            >
              Login Now
            </button>
          </form>
          <div className="mt-4 text-sm text-gray-500 flex justify-between">
            <a href="#" className="text-blue-600 underline">
              Create account.
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
