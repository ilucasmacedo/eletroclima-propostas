/**
 * Lista campos personalizados na Groner e sugere IDs para config/groner-integracao.json
 *
 * Uso:
 *   node scripts/listar-campos-groner.mjs
 *   node scripts/listar-campos-groner.mjs --json
 */
import { config } from 'dotenv';
import { isGronerConfigured } from '../lib/groner/client.js';
import {
  diagnosticarCamposGroner,
  gerarJsonCamposPersonalizados,
} from '../lib/groner/campos-personalizados.js';

config();

const asJson = process.argv.includes('--json');

if (!isGronerConfigured()) {
  console.error('Configure GRONER_TENANT e GRONER_TOKEN no .env');
  process.exit(1);
}

try {
  const diag = await diagnosticarCamposGroner();

  if (asJson) {
    console.log(JSON.stringify(diag, null, 2));
    process.exit(0);
  }

  console.log(`\nCampos personalizados na Groner: ${diag.totalCamposGroner}`);
  console.log(`Configurados no sistema: ${diag.prontos} | Pendentes: ${diag.pendentes}\n`);

  console.log('── MAPEAMENTO (sistema → Groner) ──\n');
  for (const item of Object.values(diag.sugestoes)) {
    const cfg = item.configurado ? `✓ ID ${item.configuradoId}` : '✗ não configurado';
    const sug = item.sugestao
      ? `→ sugere ID ${item.sugestao.id} "${item.sugestao.titulo}"`
      : '→ sem sugestão automática';
    console.log(`${item.chave.padEnd(22)} ${item.label}`);
    console.log(`  ${cfg}  ${sug}\n`);
  }

  console.log('── JSON para config/groner-integracao.json ──\n');
  console.log(JSON.stringify(gerarJsonCamposPersonalizados(diag.sugestoes), null, 2));
  console.log('\nOu acesse GET /api/groner/campos na Vercel após o deploy.\n');
} catch (err) {
  console.error('Erro:', err.message);
  process.exit(1);
}
