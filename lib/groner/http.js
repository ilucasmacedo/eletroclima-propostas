import { getGronerTenantEsperado } from '../cliente-config.js';

const DEFAULT_TIMEOUT_MS = 25000;

export function getGronerConfig() {
  const tenant = process.env.GRONER_TENANT?.trim();
  const token = process.env.GRONER_TOKEN?.trim();

  if (!tenant || !token) {
    const err = new Error(
      'Integração Groner não configurada. Defina GRONER_TENANT e GRONER_TOKEN no .env ou na Vercel.',
    );
    err.code = 'GRONER_NOT_CONFIGURED';
    throw err;
  }

  return {
    tenant,
    token,
    baseUrl: `https://${tenant}.api.groner.app/api`,
  };
}

/** Respostas da Groner vêm envelopadas: { StatusCode, Message, Content } */
export function desembrulharResposta(data) {
  if (!data || typeof data !== 'object') return data;
  if (data.Content != null && (data.StatusCode != null || data.Version != null)) {
    return data.Content;
  }
  if (data.content != null && (data.statusCode != null || data.version != null)) {
    return data.content;
  }
  return data;
}

export async function gronerFetch(path, { method = 'GET', body } = {}) {
  const { token, baseUrl } = getGronerConfig();
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const text = await res.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!res.ok) {
      const err = new Error(
        typeof data === 'object' && data?.title
          ? data.title
          : `Groner API ${res.status}: ${text.slice(0, 200)}`,
      );
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return desembrulharResposta(data);
  } finally {
    clearTimeout(timer);
  }
}

export function erroGronerRelevante(err) {
  if (!err) return null;
  if (err.status === 401 || err.status === 403) {
    const e = new Error(
      'Token Groner inválido ou expirado. Gere um novo token (Conta/GerarToken) e atualize na Vercel.',
    );
    e.code = 'GRONER_AUTH';
    e.status = 401;
    return e;
  }
  if (err.status >= 500) {
    const esperado = getGronerTenantEsperado();
    const e = new Error(
      `Erro no servidor Groner (${err.status}). Verifique GRONER_TENANT=${esperado || 'tenant'} na Vercel.`,
    );
    e.code = 'GRONER_SERVER';
    e.status = 502;
    return e;
  }
  return null;
}
