import cliente from '../config/cliente.json';
import { logoUrl as logoBundledUrl, logoSidebarUrl, logoSvgInline } from './brand-assets.js';

export const CLIENTE = cliente;

/** Logo horizontal — PDF e documentos claros */
export const LOGO_URL = logoBundledUrl || cliente.marca?.logoUrl || '';
/** Logo circular branca — sidebar escura */
export const LOGO_SIDEBAR_URL = logoSidebarUrl || LOGO_URL;
export const LOGO_ALT = cliente.marca?.logoAlt || cliente.nome || 'Logo';
export const LOGO_SVG_INLINE = logoSvgInline;

/** URL da logo na sidebar (círculo branco) */
export function resolveSidebarLogoUrl() {
  if (LOGO_SIDEBAR_URL) return LOGO_SIDEBAR_URL;
  return resolveLogoUrl();
}

/** URL para img genérica (asset do bundle) */
export function resolveLogoUrl() {
  if (LOGO_URL) return LOGO_URL;
  const url = cliente.marca?.logoUrl || '';
  if (!url || /^(https?:|data:|\/\/)/.test(url)) return url;
  if (typeof window !== 'undefined' && window.location?.origin) {
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${window.location.origin}${path}`;
  }
  return url;
}

/** Logo inline no PDF — html2canvas não renderiza SVG externo de forma confiável */
export function getLogoHtmlPdf() {
  if (LOGO_SVG_INLINE) {
    return `<div class="pdf-logo-inline" aria-hidden="true">${LOGO_SVG_INLINE}</div>`;
  }
  const src = resolveLogoUrl();
  if (!src) return '';
  return `<img class="pdf-logo-img" src="${src}" alt="${LOGO_ALT}" />`;
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
