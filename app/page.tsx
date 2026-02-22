import { auth } from '@/lib/auth';
import { listDocuments } from '@/lib/db';
import TopBar from './components/TopBar';
import ToolCard from './components/ToolCard';
import DashboardShell from './components/DashboardShell';

const TOOLS = [
  {
    title: 'MRD Generator',
    description: 'Generate comprehensive Market Requirements Documents with AI-powered research.',
    href: '/mrd',
    badge: 'AI',
  },
  {
    title: 'One-Pager',
    description: 'Create concise product one-pagers for stakeholder communication.',
    href: '/one-pager',
  },
];

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.email ?? '';
  const documents = userId ? await listDocuments(userId) : [];

  return (
    <>
      <TopBar />
      <main className="page">
        <div className="container" style={{ maxWidth: '900px', padding: '2rem 1.5rem' }}>
          <header style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              Welcome{session?.user?.name ? `, ${session.user.name.split(' ')[0]}` : ''}
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.95rem' }}>
              Choose a tool to get started.
            </p>
          </header>

          <section>
            <h2 style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', marginBottom: '0.75rem' }}>
              Tools
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '1rem',
            }}>
              {TOOLS.map((tool) => (
                <ToolCard key={tool.href} {...tool} />
              ))}
            </div>
          </section>

          <DashboardShell initialDocuments={documents} />
        </div>
      </main>
    </>
  );
}
