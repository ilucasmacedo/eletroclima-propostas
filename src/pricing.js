import defaultConfig from '../config/precificacao.json';
import {
  loadStoredConfig,
  saveStoredConfig,
  clearStoredConfig,
  cloneConfig,
  notifyConfigUpdated,
} from './config-store.js';

const COBERTURAS_PADRAO = {
  ACESSO: [
    'Acesso Premium ao App de monitoramento',
    'Alertas de falhas',
    'Relatório mensal de geração',
  ],
  PADRAO: [
    'Acesso Premium ao App de monitoramento',
    'Alertas de falhas',
    'Relatório de geração e consumo',
    'Suporte técnico remoto',
    'Análise de faturas',
    'Desconto de 5% em serviços avulsos',
  ],
  PREMIUM: [
    'Acesso Premium ao App de monitoramento',
    'Alertas de falhas',
    'Relatório de geração e consumo',
    'Suporte técnico remoto',
    'Análise de faturas',
    'Prioridade no atendimento',
    'Desconto de 10% em serviços avulsos',
  ],
};

let activeConfig = loadStoredConfig(defaultConfig);

export let PLANOS = {};
export let SEM_PLANO = 'NENHUM';
export let FAIXAS_KWP = [];
export let FAIXAS_DESLOCAMENTO = [];
export let SERVICOS = [];
export let COBERTURAS = {};
export let CONFIG_PRECIFICACAO = activeConfig;

function rebuildDerived(config) {
  activeConfig = config;
  CONFIG_PRECIFICACAO = config;

  PLANOS = Object.fromEntries(
    Object.entries(config.planos).map(([codigo, plano]) => [
      codigo,
      {
        ...plano,
        codigo,
        descontoAvulso: Boolean(plano.desconto_avulso),
        percentualDescontoAvulso: Number(plano.percentual_desconto_avulso) || 0,
        coberturas: plano.coberturas ?? COBERTURAS_PADRAO[codigo] ?? [],
      },
    ]),
  );

  SEM_PLANO = config.constantes.sem_plano;

  FAIXAS_KWP = config.faixas_kwp.map((f) => ({
    ...f,
    precos: f.precos ?? undefined,
  }));

  FAIXAS_DESLOCAMENTO = config.faixas_deslocamento.map((f) => ({
    km_min: f.km_min,
    km_max: f.km_max,
    taxa: f.taxa_por_km,
  }));

  SERVICOS = config.servicos_avulsos.map((s) => ({
    codigo: s.codigo,
    descricao: s.descricao,
    fora: s.fora_plano,
    tipo: s.tipo_calculo === 'POR_MODULO' ? 'POR_PLACA' : s.tipo_calculo,
    presencial: s.presencial,
    keyword: s.keyword ?? s.descricao.split(' ').pop()?.toLowerCase() ?? s.codigo,
  }));

  COBERTURAS = Object.fromEntries(
    Object.entries(PLANOS).map(([codigo, p]) => [codigo, p.coberturas]),
  );
}

rebuildDerived(activeConfig);

export function getActiveConfig() {
  return activeConfig;
}

export function applyConfig(config, { persist = true } = {}) {
  const next = cloneConfig(config);
  if (persist) saveStoredConfig(next);
  rebuildDerived(next);
  notifyConfigUpdated();
  return next;
}

export function resetConfigToDefault() {
  clearStoredConfig();
  rebuildDerived(cloneConfig(defaultConfig));
  notifyConfigUpdated();
  return activeConfig;
}

export function exportActiveConfig() {
  return cloneConfig(activeConfig);
}

function getConstantes() {
  return activeConfig.constantes;
}

export function arredondar(valor) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export function formatarMoeda(valor) {
  if (valor === null || valor === undefined) return 'Sob consulta';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

/** Converte moeda BR (20.000,00 / 20000,00 / R$ 20.000,00) para número */
export function parseMoedaBR(valor) {
  if (valor == null || valor === '') return 0;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;

  let s = String(valor).trim().replace(/\s/g, '').replace(/^R\$\s?/i, '');
  if (!s) return 0;

  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+(\.\d+)?$/.test(s)) {
    s = s.replace(/\./g, '');
  }

  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export function temPlanoContratado(plano) {
  return Boolean(plano) && plano !== SEM_PLANO;
}

export function planoTemDescontoAvulso(plano) {
  return Boolean(PLANOS[plano]?.descontoAvulso);
}

export function getPercentualDescontoAvulso(plano) {
  return PLANOS[plano]?.percentualDescontoAvulso ?? 0;
}

export function getFormasPagamento() {
  return activeConfig.formas_pagamento ?? [];
}

export function precoUnitarioServico(servico, plano, aplicarDesconto) {
  if (servico.tipo === 'PERCENTUAL') return servico.fora;
  if (!aplicarDesconto) return servico.fora;
  const pct = getPercentualDescontoAvulso(plano);
  if (!pct) return servico.fora;
  return arredondar(servico.fora * (1 - pct / 100));
}

export function buscarFaixaKwp(kwp) {
  const { kwp_maximo_automatico } = getConstantes();
  if (kwp > kwp_maximo_automatico) return FAIXAS_KWP[FAIXAS_KWP.length - 1];
  return FAIXAS_KWP.find((f) => kwp > f.kwp_min && (f.kwp_max === null || kwp <= f.kwp_max));
}

export function labelFaixaKwp(faixa) {
  const { kwp_maximo_automatico } = getConstantes();
  if (!faixa || faixa.sob_consulta) return `Acima de ${kwp_maximo_automatico} kWp`;
  return `${faixa.kwp_min} a ${faixa.kwp_max} kWp`;
}

export function calcularDeslocamento(distanciaKm) {
  const km = Math.ceil(Number(distanciaKm) || 0);
  const { raio_base_km, distancia_maxima_automatica } = getConstantes();

  if (km <= raio_base_km) {
    return { km, km_cobrados: 0, taxa: 0, valor: 0, a_combinar: false };
  }

  const faixa = FAIXAS_DESLOCAMENTO.find(
    (f) => km > f.km_min && (f.km_max === null || km <= f.km_max),
  );

  if (!faixa) {
    return { km, km_cobrados: 0, taxa: 0, valor: 0, a_combinar: km > distancia_maxima_automatica };
  }

  const valor = arredondar(km * faixa.taxa);
  return { km, km_cobrados: km, taxa: faixa.taxa, valor, a_combinar: false };
}

export function calcularMensalidade(kwp, plano) {
  const faixa = buscarFaixaKwp(kwp);

  if (!temPlanoContratado(plano)) {
    return { sob_consulta: false, motivos: [], mensalidade: null, faixa };
  }

  const motivos = [];
  if (faixa.sob_consulta) motivos.push('KWP_ACIMA_LIMITE');

  if (motivos.length > 0) {
    return { sob_consulta: true, motivos, mensalidade: null, faixa };
  }

  return {
    sob_consulta: false,
    motivos: [],
    mensalidade: faixa.precos?.[plano] ?? null,
    faixa,
  };
}

export function calcularServico(servico, opts) {
  const { plano, aplicarDescontoPlano, qtdPlacas, valorContrato, distanciaKm, incluirDeslocamento } = opts;
  const precoBase = precoUnitarioServico(servico, plano, aplicarDescontoPlano);
  let subtotal = 0;

  switch (servico.tipo) {
    case 'FIXO':
      subtotal = precoBase;
      break;
    case 'POR_PLACA':
      subtotal = precoBase * (qtdPlacas || 0);
      break;
    case 'PERCENTUAL':
      subtotal = (valorContrato || 0) * precoBase;
      break;
    default:
      subtotal = 0;
  }

  subtotal = arredondar(subtotal);

  let deslocamento = 0;
  const { raio_base_km } = getConstantes();
  if (incluirDeslocamento && servico.presencial && distanciaKm > raio_base_km) {
    const d = calcularDeslocamento(distanciaKm);
    deslocamento = d.a_combinar ? 0 : d.valor;
  }

  return {
    codigo: servico.codigo,
    descricao: servico.descricao,
    subtotal: arredondar(subtotal + deslocamento),
    valorServico: subtotal,
    deslocamento,
  };
}

export function gerarNumeroProposta() {
  const ano = new Date().getFullYear();
  const { numero_proposta_seq_min: min, numero_proposta_seq_max: max } = getConstantes();
  const seq = String(Math.floor(Math.random() * (max - min + 1)) + min);
  return `${ano}-${seq}`;
}

export function calcularProposta(input) {
  const constantes = getConstantes();
  const {
    kwp,
    plano,
    distanciaKm,
    servicosSelecionados = [],
    qtdPlacas = 0,
    valorContrato = 0,
    incluirDeslocamentoGlobal = true,
    temPlanoAtivo = false,
  } = input;

  const mensalidadeResult = temPlanoContratado(plano)
    ? calcularMensalidade(kwp, plano)
    : { sob_consulta: false, motivos: [], mensalidade: null, faixa: buscarFaixaKwp(kwp) };

  const deslocamento = calcularDeslocamento(distanciaKm);
  const motivos = [...mensalidadeResult.motivos];

  const usarPrecoComPlano =
    planoTemDescontoAvulso(plano) &&
    (temPlanoAtivo || (temPlanoContratado(plano) && !mensalidadeResult.sob_consulta));

  if (deslocamento.a_combinar) motivos.push('DISTANCIA_ACIMA_600');

  const itens = [];

  if (temPlanoContratado(plano) && !mensalidadeResult.sob_consulta && PLANOS[plano]) {
    itens.push({
      tipo: 'MENSALIDADE',
      codigo: plano,
      descricao: `${PLANOS[plano].nome} — faixa ${labelFaixaKwp(mensalidadeResult.faixa)}`,
      subtotal: mensalidadeResult.mensalidade,
    });
  }

  let totalAvulsos = 0;

  for (const codigo of servicosSelecionados) {
    const servico = SERVICOS.find((s) => s.codigo === codigo);
    if (!servico) continue;
    const result = calcularServico(servico, {
      plano,
      aplicarDescontoPlano: usarPrecoComPlano,
      qtdPlacas,
      valorContrato,
      distanciaKm,
      incluirDeslocamento: false,
    });
    itens.push({
      tipo: 'SERVICO',
      codigo,
      descricao: servico.descricao,
      subtotal: result.subtotal,
    });
    totalAvulsos += result.subtotal;
  }

  if (
    incluirDeslocamentoGlobal &&
    distanciaKm > constantes.raio_base_km &&
    !deslocamento.a_combinar &&
    deslocamento.valor > 0
  ) {
    itens.push({
      tipo: 'DESLOCAMENTO',
      codigo: 'DESLOCAMENTO',
      descricao: `Taxa de deslocamento (${deslocamento.km_cobrados} km × R$ ${deslocamento.taxa.toFixed(2).replace('.', ',')}/km)`,
      subtotal: deslocamento.valor,
    });
    totalAvulsos += deslocamento.valor;
  }

  totalAvulsos = arredondar(totalAvulsos);
  const mensalidade = mensalidadeResult.mensalidade;
  const sobConsultaPlano = temPlanoContratado(plano) && mensalidadeResult.sob_consulta;
  const primeiraCobranca =
    sobConsultaPlano && deslocamento.a_combinar
      ? null
      : arredondar((mensalidade || 0) + totalAvulsos);

  return {
    sob_consulta: sobConsultaPlano || deslocamento.a_combinar,
    motivos_sob_consulta: motivos,
    mensalidade,
    faixa_kwp: mensalidadeResult.faixa,
    plano,
    itens,
    deslocamento,
    totais: {
      recorrente_mensal: mensalidade,
      avulsos: totalAvulsos,
      primeira_cobranca: primeiraCobranca,
    },
  };
}

export function precosComparativoPlanos(kwp) {
  return Object.keys(PLANOS).map((codigo) => {
    const result = calcularMensalidade(kwp, codigo);
    return {
      ...PLANOS[codigo],
      mensalidade: result.mensalidade,
      sob_consulta: result.sob_consulta,
      faixa: labelFaixaKwp(result.faixa),
    };
  });
}
