import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Marquee } from "@/components/Marquee";
import { CityCard } from "@/components/CityCard";
import { CheckerIcon } from "@/components/CheckerIcon";
import { citiesIndex } from "@/data/cities-index";

export default function Home() {
  const availableCount = citiesIndex.filter((c) => c.available).length;

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <Navbar />

      <main className="flex-1">
        <section className="border-b-2 border-ink bg-paper px-5 py-16 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="flex items-center gap-2">
              <CheckerIcon size={16} />
              <span className="font-label text-xs font-bold tracking-widest text-ink/60 uppercase">
                50 ciudades · en construcción
              </span>
            </div>
            <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[0.95] font-black uppercase sm:text-7xl">
              El mapa gastronómico del mundo,{" "}
              <span className="bg-mustard px-2">curado</span> lugar por lugar.
            </h1>
            <p className="mt-6 max-w-xl font-body text-lg leading-relaxed text-ink/75">
              Nada de listas genéricas. Por cada ciudad elegimos un{" "}
              <strong>Top 5</strong> con respaldo real — Time Out,
              influencers, TV o virales de redes — y dejamos el mapa completo
              a un clic de distancia en Google My Maps.
            </p>
          </div>
        </section>

        <Marquee text="Top 5 curado · fuentes reales · sin inventar nada · " />

        <section className="px-5 py-14 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 flex items-end justify-between gap-4">
              <h2 className="font-display text-3xl font-black uppercase sm:text-4xl">
                Ciudades
              </h2>
              <span className="font-label text-xs font-bold text-ink/60 uppercase">
                {availableCount} / {citiesIndex.length} listas
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {citiesIndex.map((city, i) => (
                <CityCard key={city.slug} city={city} index={i} />
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
