export default function AccessDeniedPage() {
  return (
    <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '2rem' }}>
      <div style={{
        maxWidth: '420px',
        textAlign: 'center',
        padding: '2.5rem',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        background: 'var(--card-bg, #fff)',
      }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.75rem' }}>
          Access Restricted
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          Your account doesn&apos;t have permission to use this application.
          Please contact your administrator for access.
        </p>
        <a
          href="/login"
          style={{
            display: 'inline-block',
            padding: '0.5rem 1.5rem',
            borderRadius: '8px',
            background: 'var(--brand-primary, #1D1F4A)',
            color: '#fff',
            textDecoration: 'none',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          Back to Login
        </a>
      </div>
    </main>
  );
}
