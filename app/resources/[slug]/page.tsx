import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicResource, listPublicResources } from '@/lib/services/resources';
import ResourceAction from '@/components/resources/resource-action';
import { getDisplayImage } from '@/lib/media';
export const revalidate = 60;
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const resource = await getPublicResource(slug); return { title: resource?.title ?? 'Resource', description: resource?.excerpt ?? 'Downloadable DTECHNURSE resource.' }; }
export default async function ResourceDetailPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ download?: string; purchase?: string }> }) {
  const { slug } = await params; const query = await searchParams; const resource = await getPublicResource(slug); if (!resource) notFound();
  const related = (await listPublicResources({ category: resource.category_slug ?? undefined, limit: 4 }).catch(() => [])).filter(item => item.id !== resource.id).slice(0, 3);
  return <main className="content-page resource-detail-page"><Link href="/resources" className="text-link">← All resources</Link><article><div className="resource-detail-cover"><img src={getDisplayImage(resource.featured_media_url)} alt={resource.featured_media_alt || `${resource.title} cover`} /></div><span className="eyebrow">{resource.category_name || 'DTECHNURSE RESOURCE'} · {resource.file_type}</span><h1>{resource.title}</h1>{resource.excerpt && <p className="lead">{resource.excerpt}</p>}<div className="resource-detail-meta"><span>{resource.pricing === 'paid' ? `₦${(resource.price_kobo / 100).toLocaleString('en-NG')}` : 'Free download'}</span><span>{resource.download_count.toLocaleString()} downloads</span></div><div className="resource-rich-content" dangerouslySetInnerHTML={{ __html: resource.body_html }} /><ResourceAction slug={resource.slug} pricing={resource.pricing} autoAction={query.purchase === '1' ? 'purchase' : query.download === '1' ? 'download' : ''} /></article>
    {related.length > 0 && <section className="resource-related"><h2>Related resources</h2><div className="resource-related-list">{related.map(item => <Link href={`/resources/${item.slug}`} key={item.id}><img src={getDisplayImage(item.featured_media_url)} alt="" /><span><strong>{item.title}</strong><small>{item.file_type} · {item.pricing === 'paid' ? `₦${(item.price_kobo / 100).toLocaleString('en-NG')}` : 'Free'}</small></span></Link>)}</div></section>}
  </main>;
}
