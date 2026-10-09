import { createResourceApiDependencies } from "@/server/api/resource-api-dependencies";
import { createFilesCollectionAdapter } from "@/server/api/resource-api";
import { handlePublicApiRequest } from "@/server/api/public-api-runtime";

export const dynamic = "force-dynamic";
export function GET(request: Request) {
  return handlePublicApiRequest(request, admin =>
    createFilesCollectionAdapter(createResourceApiDependencies(admin).files));
}
