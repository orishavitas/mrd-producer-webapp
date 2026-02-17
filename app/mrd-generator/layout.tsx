import type { Metadata } from 'next';
import { MRDProvider } from './lib/mrd-context';
import '@/styles/tokens/brief-helper.css';

export const metadata: Metadata = {
  title: 'MRD Generator - MRD Producer',
  description: 'Generate full Market Requirements Documents from product concepts',
};

export default function MRDGeneratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MRDProvider>{children}</MRDProvider>;
}
