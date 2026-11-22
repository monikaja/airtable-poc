import { searchRoute } from './_lib/routes.js';
import { getSnapshot } from './_lib/snapshot.js';

/** GET /api/search?q= → fabrics, trims and suppliers that match. */
export function GET(request: Request): Promise<Response> {
  return searchRoute(request, getSnapshot);
}
