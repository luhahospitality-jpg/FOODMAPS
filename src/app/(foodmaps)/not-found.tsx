import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { CheckerIcon } from "@/components/CheckerIcon";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <Navbar />
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-5 py-24 text-center">
        <CheckerIcon size={32} />
        <h1 className="font-display text-6xl font-black uppercase">
          404
        </h1>
        <p className="max-w-sm font-body text-ink/70">
          Esa ciudad todavía no está en el mapa. Volvé al inicio para ver las
          que ya tienen Top 5.
        </p>
        <Link
          href="/"
          className="mt-2 inline-flex items-center gap-2 rounded-full border-2 border-ink bg-mustard px-6 py-3 font-label text-sm font-bold tracking-wide uppercase shadow-hard"
        >
          Volver al inicio
        </Link>
      </main>
    </div>
  );
}
