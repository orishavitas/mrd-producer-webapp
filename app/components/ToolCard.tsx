import Link from 'next/link';

interface ToolCardProps {
  title: string;
  description: string;
  href: string;
  badge?: string;
}

export default function ToolCard({ title, description, href, badge }: ToolCardProps) {
  return (
    <Link
      href={href}
      style={{
        display: 'block',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '1.5rem',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'box-shadow 0.15s ease, transform 0.15s ease',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        position: 'relative',
      }}
      className="tool-card"
    >
      {badge && (
        <span style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          fontSize: '0.7rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          background: 'var(--accent-soft)',
          color: 'var(--accent)',
          padding: '0.15rem 0.5rem',
          borderRadius: '999px',
        }}>
          {badge}
        </span>
      )}
      <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.4rem' }}>
        {title}
      </h3>
      <p style={{ fontSize: '0.875rem', color: 'var(--muted)', lineHeight: 1.5 }}>
        {description}
      </p>
    </Link>
  );
}
