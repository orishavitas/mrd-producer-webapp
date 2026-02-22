import { signIn } from '@/lib/auth';

export default function LoginPage() {
  return (
    <main className="page">
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="card" style={{ maxWidth: '420px', width: '100%', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>MRD Producer</h1>
          <p style={{ color: 'var(--on-surface-variant)', marginBottom: '2rem' }}>
            Sign in to access your tools and documents
          </p>
          <form
            action={async () => {
              'use server';
              await signIn('google', { redirectTo: '/' });
            }}
          >
            <button type="submit" className="btn-primary" style={{ width: '100%' }}>
              Sign in with Google
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
