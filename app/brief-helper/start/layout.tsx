import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Brief Helper - Get Started - MRD Producer',
  description: 'Start your simplified product brief with AI assistance',
};

export default function BriefHelperStartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
