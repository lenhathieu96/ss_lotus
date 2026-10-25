import { LibraryPublicPage } from '@features/library/pages/library-public-page';

export default async function LibraryPublicRoute({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  return <LibraryPublicPage initialCategoryId={typeof category === 'string' ? category : ''} />;
}
