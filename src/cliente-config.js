import cliente from '../config/cliente.json';

export const CLIENTE = cliente;

export const LOGO_URL = cliente.marca?.logoUrl || '';
export const LOGO_ALT = cliente.marca?.logoAlt || cliente.nome || 'Logo';

/** URL absoluta da logo — html2pdf/html2canvas exige origem resolvida */
export function resolveLogoUrl(baseUrl) {
  const url = LOGO_URL;
  if (!url) return '';
  if (/^(https?:|data:|\/\/)/.test(url)) return url;
  const origin =
    baseUrl ||
    (typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '');
  if (!origin) return url.startsWith('/') ? url : `/${url}`;
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${origin}${path}`;
}

export function getTituloPropostaPdf() {
  return cliente.produto?.tituloPdf || 'Proposta Comercial';
}

export function tituloPagina(view) {
  const curto = cliente.nomeCurto || cliente.nome;
  const ui = cliente.ui || {};
  const map = {
    proposta: ui.tituloProposta || 'Nova Proposta',
    playbook: ui.tituloPlaybook || 'Playbook',
    admin: ui.tituloAdmin || 'Administração',
  };
  return `${curto} — ${map[view] || map.proposta}`;
}

export function getVendedorPadrao() {
  return cliente.marca?.vendedorPadrao || `Equipe Comercial ${cliente.nomeCurto || ''}`.trim();
}

export function getRodapePdf() {
  const site = cliente.marca?.site || '';
  const email = cliente.marca?.email || '';
  if (site && email) return `${site} · ${email}`;
  return site || email || '';
}

export function getStorageKeyPrecificacao() {
  const id = cliente.id || 'cliente';
  return cliente.localStorage?.precificacaoKey || `${id}-precificacao-v1`;
}

export function getEventoConfigAtualizada() {
  const id = cliente.id || 'cliente';
  return cliente.localStorage?.eventoConfig || `${id}-config-updated`;
}

export function getNomeCurto() {
  return cliente.nomeCurto || cliente.nome || 'Cliente';
}

export function getSistemaNome() {
  return cliente.produto?.sistemaNome || `${getNomeCurto()} Propostas`;
}

export function getSubtituloProposta() {
  return cliente.produto?.subtituloProposta || 'Monitoramento e Gestão Energética';
}

export function getFormasPagamentoPdf() {
  const todas = cliente.produto?.formasPagamentoPdf;
  if (Array.isArray(todas) && todas.length) return todas;
  return ['Pix ou Transferência', 'Cartão de crédito'];
}
