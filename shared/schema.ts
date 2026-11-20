// Single source of truth for Airtable option values shared by /api, /src and /scripts.

export const MATERIAL_STATUSES = ['Activo', 'En revisión', 'Descatalogado'] as const;
export type MaterialStatus = (typeof MATERIAL_STATUSES)[number];

export const TRIM_TYPES = ['Botón', 'Cremallera', 'Etiqueta', 'Velcro', 'Cinta reflectante'] as const;
export type TrimType = (typeof TRIM_TYPES)[number];
