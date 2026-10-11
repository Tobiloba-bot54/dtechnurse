import ResourcesManager from '@/components/admin/resources-manager';
export const metadata = { title: 'Resource manager | DTECHNURSE' };
export default function AdminResourcesPage() { return <main className="content-page admin-page"><span className="eyebrow">RESOURCE MANAGEMENT</span><h1>Resource download centre</h1><p className="lead">Upload cover images, write resource descriptions, manage Google Drive links, set pricing, and publish resources to the website.</p><ResourcesManager /></main>; }
