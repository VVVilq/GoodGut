import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const port = Number(process.env.GOODGUT_FIXTURE_PORT ?? 8787);
const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const files = new Map([
  ['5449000000996', 'scripts/fixtures/nutrition-warning-scan/liquid-coca-cola.json'],
  ['3017620422003', 'scripts/fixtures/nutrition-warning-scan/solid-nutella.json'],
  ['6111242100992', 'scripts/fixtures/nutrition-warning-scan/partial-ingredients.json'],
  ['0000000001008', 'scripts/fixtures/nutrition-warning-scan/missing-ingredients.json'],
  ['9900000000010', 'scripts/fixtures/nutrition-warning-scan/unavailable-nutrition.json'],
]);
const notFound = (barcode) => ({ contractVersion: '3.0', outcome: 'not_found', barcode, source: { provider: 'open_food_facts' }, reason: 'not_in_source' });
const server = http.createServer(async (request, response) => { const match = request.url?.match(/^\/products\/([0-9]+)$/); if (request.method !== 'GET' || !match) { response.writeHead(404).end(); return; } const barcode = match[1]; try { const value = files.has(barcode) ? JSON.parse(await readFile(resolve(root, files.get(barcode)), 'utf8')) : notFound(barcode); response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' }); response.end(JSON.stringify(value)); } catch { response.writeHead(500).end(); } });
server.listen(port, '0.0.0.0', () => console.log(`GoodGut nutrition fixtures listening on ${port}`));
const shutdown = () => server.close(() => process.exit(0)); process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
