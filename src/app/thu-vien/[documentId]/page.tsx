import { LibraryDetailPage } from '@features/library/pages/library-detail-page';

export default async function LibraryDocumentPage({ params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params;
  return <LibraryDetailPage documentId={documentId} />;
}
