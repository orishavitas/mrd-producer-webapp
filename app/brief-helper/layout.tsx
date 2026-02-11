import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Brief Helper - MRD Producer',
  description: 'Create simplified product briefs with AI assistance',
};

export default function BriefHelperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
