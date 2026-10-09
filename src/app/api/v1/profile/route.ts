import { createResourceApiDependencies } from "@/server/api/resource-api-dependencies";
import { createProfileAdapter } from "@/server/api/resource-api";
import { handlePublicApiRequest } from "@/server/api/public-api-runtime";

export const dynamic = "force-dynamic";
function handle(request: Request) {
  return handlePublicApiRequest(request, admin =>
    createProfileAdapter(createResourceApiDependencies(admin).profile));
}
export { handle as GET, handle as PATCH };
