import { hasFeature } from '@/lib/feature-gate';

export async function canAccessComments(email: string): Promise<boolean> {
  return (
    (await hasFeature(email, 'commentor')) ||
    (await hasFeature(email, 'prd-producer')) ||
    (await hasFeature(email, 'rd-viewer'))
  );
}
