import { notFound } from 'next/navigation';
import { getCategoryBySlug } from '@/lib/services/store/catalog';
import { StoreBrowser } from '@/components/store/store-browser';

export const revalidate = 60;
type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug).catch(() => null);
  if (!category || !category.isActive) return { title: 'Category not found | DTECHNURSE' };
  return {
    title: `${category.name} | DTECHNURSE Store`,
    description: category.description || `Shop ${category.name} products at the DTECHNURSE store.`,
  };
}

export default async function StoreCategoryPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug).catch(() => null);
  if (!category || !category.isActive) notFound();
  return (
    <main className="content-page store-shell">
      <span className="eyebrow">STORE CATEGORY</span>
      <h1>{category.name}</h1>
      {category.description && <p className="lead">{category.description}</p>}
      <StoreBrowser categorySlug={category.slug} />
    </main>
  );
}
