#!/usr/bin/env node
/**
 * Gera token JWT longo (500 dias) — POST /api/Conta/GerarToken
 *
 * Uso:
 *   node scripts/gerar-token-groner.mjs --email athos@eletroclimassolar.com.br --senha "SUA_SENHA"
 *
 * Ou via .env (não commite a senha):
 *   GRONER_TENANT=eletroclima
 *   GRONER_EMAIL=...
 *   GRONER_SENHA=...
 *   node scripts/gerar-token-groner.mjs
 */
import { config } from 'dotenv';

config({ override: true });

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      out[a.slice(2).replace(/-/g, '_')] = argv[i + 1];
      i++;
    }
  }
  return out;
}

const args = parseArgs(process.argv);
const tenant = args.tenant?.trim() || process.env.GRONER_TENANT?.trim();
const email = args.email?.trim() || process.env.GRONER_EMAIL?.trim();
const senha = args.senha ?? process.env.GRONER_SENHA;

if (!tenant || !email || !senha) {
  console.error(`
Gera token de integração Groner (500 dias).

Uso:
  node scripts/gerar-token-groner.mjs --email "usuario@empresa.com" --senha "senha"

Ou defina no .env: GRONER_TENANT, GRONER_EMAIL, GRONER_SENHA
`);
  process.exit(1);
}

const url = `https://${tenant}.api.groner.app/api/Conta/GerarToken`;

const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify({ email, senha }),
});

const text = await res.text();
let data;
try {
  data = JSON.parse(text);
} catch {
  console.error('Resposta inválida:', text.slice(0, 300));
  process.exit(1);
}

const inner = data.Content ?? data.content ?? data;
const token =
  inner?.accessToken ??
  inner?.AccessToken ??
  inner?.token ??
  inner?.Token ??
  data.accessToken ??
  data.AccessToken;

if (!res.ok || !token) {
  const msg =
    data.Message ??
    data.ResponseException?.ExceptionMessage ??
    inner?.message ??
    text.slice(0, 300);
  console.error(`Erro ${res.status}: ${msg}`);
  process.exit(1);
}

console.log('\n✓ Token gerado com sucesso.\n');
console.log('Cole em .env e na Vercel:\n');
console.log(`GRONER_TOKEN=${token}\n`);
console.log('Depois: npm run dev:all  e  redeploy na Vercel.\n');
