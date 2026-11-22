import type { Fabric, Trim } from './types.js';

// How materials are named in the interface, in search results and impact headers alike.

export function fabricLabel(fabric: Fabric): string {
  return `${fabric.code} · ${fabric.name}`;
}

export function trimLabel(trim: Trim): string {
  return trim.type ? `${trim.reference} · ${trim.type}` : trim.reference;
}
