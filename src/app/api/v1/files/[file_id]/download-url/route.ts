import { createUnavailableStorageAdapter } from "@/server/api/resource-api";
import { handlePublicApiRequest } from "@/server/api/public-api-runtime";

export const dynamic = "force-dynamic";
export function POST(request: Request) {
  return handlePublicApiRequest(request, () => createUnavailableStorageAdapter());
}
