import { impactRoute } from './_lib/routes.js';
import { getSnapshot } from './_lib/snapshot.js';

/** GET /api/impact?tipo=tejido|avio|proveedor&id= → affected garments and clients. */
export function GET(request: Request): Promise<Response> {
  return impactRoute(request, getSnapshot);
}
