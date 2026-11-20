import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { AirtableClient } from './seed/airtable-client';
import { fixtures } from './seed/fixtures';
import { runSeed } from './seed/run';
import { TABLE_SPECS } from './seed/tables';

// Usage: npm run seed            → creates missing tables and inserts demo data into an empty base
//        npm run seed -- --reset → deletes existing records (never tables) and inserts them again

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
config({ path: resolve(projectRoot, '.env.local'), quiet: true });

const REQUIRED_VARIABLES = ['AIRTABLE_BASE_ID', 'AIRTABLE_TOKEN_WRITE'] as const;

async function main(): Promise<void> {
  const missing = REQUIRED_VARIABLES.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    console.error(`Faltan variables de entorno en .env.local: ${missing.join(', ')}`);
    process.exitCode = 1;
    return;
  }

  const client = new AirtableClient(process.env.AIRTABLE_BASE_ID ?? '', process.env.AIRTABLE_TOKEN_WRITE ?? '');
  const summary = await runSeed(client, fixtures, {
    reset: process.argv.includes('--reset'),
    log: (message) => console.log(message),
  });

  console.log('\nSeed completado:');
  for (const spec of TABLE_SPECS) console.log(`  ${spec.name}: ${summary[spec.key]}`);
  console.log('\nSiguiente paso: crea a mano los campos calculados de docs/campos-calculados.md.');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
