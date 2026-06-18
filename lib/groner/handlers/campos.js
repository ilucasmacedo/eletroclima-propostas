import { isGronerConfigured } from '../client.js';
import { diagnosticarCamposGroner, gerarJsonCamposPersonalizados } from '../campos-personalizados.js';
import { getCamposConfigurados } from '../campos-config.js';
import {
  handleOptions,
  sendJson,
  setCors,
} from './http-utils.js';

export async function handleCamposGroner(req, res) {
  setCors(req, res);

  if (req.method === 'OPTIONS') {
    handleOptions(req, res);
    return;
  }

  if (req.method !== 'GET') {
    sendJson(res, 405, { ok: false, erro: 'Use GET.' });
    return;
  }

  try {
    if (!isGronerConfigured()) {
      sendJson(res, 503, {
        ok: false,
        erro: 'Integração Groner não configurada no servidor.',
        code: 'GRONER_NOT_CONFIGURED',
      });
      return;
    }

    const diagnostico = await diagnosticarCamposGroner();

    sendJson(res, 200, {
      ...diagnostico,
      jsonSugerido: gerarJsonCamposPersonalizados(diagnostico.sugestoes),
      instrucao:
        'Copie camposPersonalizados para config/groner-integracao.json ou use variáveis GRONER_CAMPO_* no .env / Vercel.',
    });
  } catch (err) {
    console.error('[groner/campos]', err);
    sendJson(res, err.status && err.status < 500 ? err.status : 500, {
      ok: false,
      erro: err.message || 'Erro ao listar campos personalizados.',
      configurados: getCamposConfigurados(),
    });
  }
}
