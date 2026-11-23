// Measures GET /api/impact against a deployment, to check the PRD target of under 3 seconds.
//
//   npm run perf -- https://airtable-poc-six.vercel.app [requests per case]
//
// It only reads: it finds the demo cases through /api/search and then calls /api/impact
// one request at a time. It needs no secrets. Exit code 1 when any request misses the target.

import { PERF_TARGET_MS, summarize, type PerfSummary } from './perf/stats';

interface Case {
  label: string;
  query: string;
  tipo: 'tejido' | 'avio' | 'proveedor';
}

const CASES: Case[] = [
  { label: 'Tejido TJ-007 (3 prendas, 4 clientes)', query: 'TJ-007', tipo: 'tejido' },
  { label: 'Avío AV-005 (en revisión)', query: 'AV-005', tipo: 'avio' },
  { label: 'Proveedor Anatolia Dokuma (todos sus materiales)', query: 'Anatolia', tipo: 'proveedor' },
];

async function timedGet(url: string): Promise<{ ms: number; body: unknown }> {
  const start = performance.now();
  const response = await fetch(url);
  const body: unknown = await response.json();
  const ms = performance.now() - start;
  if (!response.ok) throw new Error(`${url} respondió ${response.status}: ${JSON.stringify(body)}`);
  return { ms, body };
}

async function findId(base: string, item: Case): Promise<string> {
  const { body } = await timedGet(`${base}/api/search?q=${encodeURIComponent(item.query)}`);
  const { results } = body as { results: { tipo: string; id: string }[] };
  const match = results.find((result) => result.tipo === item.tipo);
  if (!match) throw new Error(`La búsqueda "${item.query}" no devolvió ningún ${item.tipo}.`);
  return match.id;
}

const ms = (value: number) => `${Math.round(value)} ms`;

function row(label: string, summary: PerfSummary): string {
  const verdict = summary.meetsTarget ? 'cumple' : 'NO cumple';
  return `| ${label} | ${ms(summary.firstMs)} | ${ms(summary.medianMs)} | ${ms(summary.p95Ms)} | ${ms(summary.maxMs)} | ${verdict} |`;
}

async function main() {
  const [baseArg, countArg] = process.argv.slice(2);
  if (!baseArg) {
    console.error('Uso: npm run perf -- <url del despliegue> [peticiones por caso]');
    process.exit(2);
  }
  const base = baseArg.replace(/\/+$/, '');
  const count = Number(countArg ?? 10);
  if (!Number.isInteger(count) || count < 1) {
    console.error('El número de peticiones por caso debe ser un entero positivo.');
    process.exit(2);
  }

  const rows: string[] = [];
  let allMeet = true;
  for (const item of CASES) {
    const id = await findId(base, item);
    const times: number[] = [];
    for (let index = 0; index < count; index += 1) {
      times.push((await timedGet(`${base}/api/impact?tipo=${item.tipo}&id=${encodeURIComponent(id)}`)).ms);
    }
    const summary = summarize(times);
    allMeet &&= summary.meetsTarget;
    rows.push(row(item.label, summary));
  }

  console.log(`GET /api/impact en ${base} · ${count} peticiones por caso · objetivo < ${PERF_TARGET_MS} ms`);
  console.log(`Medido el ${new Date().toISOString().slice(0, 10)} desde esta máquina (incluye la red hasta Vercel).\n`);
  console.log('| Caso | Primera | Mediana | p95 | Máx. | Objetivo |');
  console.log('| --- | ---: | ---: | ---: | ---: | --- |');
  for (const line of rows) console.log(line);
  process.exit(allMeet ? 0 : 1);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(2);
});
