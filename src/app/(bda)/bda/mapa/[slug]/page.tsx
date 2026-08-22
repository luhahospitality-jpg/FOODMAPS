import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProject, projects } from "@/data/bda/projects";
import { getBrand } from "@/data/bda/brands";
import ProjectPageClient from "./ProjectPageClient";

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

  return (
    <ProjectPageClient
      project={project}
      brand={brand}
      related={related}
      relatedByRegion={relatedByRegion}
    />
  );
}
