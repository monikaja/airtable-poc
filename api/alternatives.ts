import { getExplainer } from './_lib/explainer.js';
import { alternativesRoute } from './_lib/routes.js';
import { getSnapshot } from './_lib/snapshot.js';

/** GET /api/alternatives?id= → up to 3 compatible materials, each with one LLM sentence. */
export function GET(request: Request): Promise<Response> {
  return alternativesRoute(request, getSnapshot, getExplainer());
}
