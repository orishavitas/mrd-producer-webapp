import type { Metadata } from 'next';
import { BriefProvider } from './lib/brief-context';

export const metadata: Metadata = {
  title: 'Brief Helper - MRD Producer',
  description: 'Create simplified product briefs with AI assistance',
};

/**
 * Brief Helper Layout
 *
 * Wraps all brief-helper routes with BriefProvider:
 * - /brief-helper (main page)
 * - /brief-helper/start (start page)
 *
 * Ensures state is shared across routes via sessionStorage.
 */
export default function BriefHelperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BriefProvider>{children}</BriefProvider>;
}
