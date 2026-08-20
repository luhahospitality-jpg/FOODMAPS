import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject, projects } from "@/data/bda/projects";
import { getBrand } from "@/data/bda/brands";
import CategoryBadge from "@/components/bda/CategoryBadge";
import ProjectPlate from "@/components/bda/ProjectPlate";
import ProjectCard from "@/components/bda/ProjectCard";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};
  return {
    title: `${project.name} — BDA`,
    description: project.description,
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const brand = getBrand(project.brandSlug);
  const related = projects
    .filter((p) => p.slug !== project.slug && p.brandSlug === project.brandSlug)
    .slice(0, 3);
  const relatedByRegion =
    related.length > 0
      ? related
      : projects
          .filter((p) => p.slug !== project.slug && p.region === project.region)
          .slice(0, 3);

  const facts: Array<[string, string]> = [
    ["Ciudad", project.city],
    ["País", project.region],
    ["Marca", brand?.name ?? "—"],
  ];
  if (project.status) facts.push(["Estado", project.status]);
  if (project.developer) facts.push(["Desarrollador", project.developer]);
  if (project.units) facts.push(["Unidades", project.units]);
  if (project.credits) facts.push(["Créditos", project.credits]);

  return (
    <div>
      <section className="mx-auto max-w-6xl px-5 pb-10 pt-10 sm:px-8 sm:pt-16">
        <Link
          href="/bda/mapa"
          className="bda-mono text-[10px] uppercase tracking-[0.14em] text-bda-muted hover:text-bda-ink"
        >
          ← Mapa
        </Link>
      </section>

      {brand && (
        <section className="mx-auto max-w-6xl px-5 sm:px-8">
          <ProjectPlate
            name={brand.name}
            category={brand.category}
            rounded="rounded-2xl"
            className="max-h-[420px] border bda-hairline"
          />
        </section>
      )}

      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-[1fr_260px] sm:gap-16">
          <div>
            {brand && <CategoryBadge category={brand.category} />}
            <h1 className="bda-serif mt-3 text-3xl leading-[1.1] text-bda-ink sm:text-4xl">
              {project.name}
            </h1>
            <p className="mt-2 text-sm text-bda-muted">
              {brand?.name} · {project.city}
            </p>
            <p className="bda-serif mt-8 max-w-lg text-xl italic leading-snug text-bda-ink/80">
              {project.description}
            </p>
          </div>

          <dl className="h-fit space-y-4 border-t bda-hairline pt-6 sm:border-t-0 sm:border-l sm:pl-8 sm:pt-0">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt className="bda-mono text-[10px] uppercase tracking-[0.14em] text-bda-muted">
                  {label}
                </dt>
                <dd className="mt-1 text-sm text-bda-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {relatedByRegion.length > 0 && (
        <section className="border-t bda-hairline">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
            <h2 className="bda-serif text-xl text-bda-ink">
              {related.length > 0
                ? `Otros proyectos de ${brand?.name}`
                : `Otros proyectos en ${project.region}`}
            </h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-3">
              {relatedByRegion.map((p) => (
                <ProjectCard key={p.slug} project={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
