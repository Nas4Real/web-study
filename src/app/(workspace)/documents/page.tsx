import { DocumentsPage } from "@/features/documents/documents-page";
import { loadDocumentsPageData } from "@/server/study/documents-page-loader";

export default async function DocumentsRoute({ searchParams }: { searchParams: Promise<{ e2eScope?: string }> }) {
  const query = await searchParams;
  const data = await loadDocumentsPageData(query.e2eScope);
  return <DocumentsPage data={data} />;
}
