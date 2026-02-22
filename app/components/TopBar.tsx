import { auth, signOut } from '@/lib/auth';

export default async function TopBar() {
  const session = await auth();
  const user = session?.user;

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 2rem',
      height: '60px',
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }}>
      <span style={{ fontWeight: 600, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>
        MRD Producer
      </span>
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {user.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt={user.name ?? 'User avatar'}
              width={32}
              height={32}
              style={{ borderRadius: '50%' }}
            />
          )}
          <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>{user.name}</span>
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/login' });
            }}
          >
            <button
              type="submit"
              style={{
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '0.25rem 0.75rem',
                fontSize: '0.85rem',
                cursor: 'pointer',
                color: 'var(--muted)',
              }}
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </header>
  );
}
