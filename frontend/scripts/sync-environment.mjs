import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const envPath = resolve(root, '.env');
const targetPath = resolve(root, 'src/environments/environment.ts');

function parseDotEnv(content) {
  const values = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separator = trimmed.indexOf('=');
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

if (!existsSync(envPath)) {
  console.log('[sync-environment] .env não encontrado; mantendo environment.ts atual.');
  process.exit(0);
}

const env = parseDotEnv(readFileSync(envPath, 'utf8'));
const apiUrl = env.API_URL?.trim() || 'http://localhost:3000';
const sentryDsn = env.SENTRY_DSN?.trim() || '';

const fileContent = `export const environment = {
  production: false,
  apiUrl: '${apiUrl.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}',
  sentryDsn: '${sentryDsn.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'
};
`;

writeFileSync(targetPath, fileContent, 'utf8');
console.log(`[sync-environment] environment.ts atualizado (apiUrl=${apiUrl}).`);
