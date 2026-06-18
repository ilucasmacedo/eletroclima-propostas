import { gronerFetch } from './http.js';
import { getCampoId, getCamposConfigurados } from './campos-config.js';

/** Campos que o sistema grava ao gerar a proposta (POST CampoPersonalizado/{id}/Responder) */
export const CATALOGO_CAMPOS_SYNC = {
  kwp: {
    label: 'Potência (kWp)',
    palavrasChave: ['kwp', 'potência', 'potencia', 'potencia cc', 'potência cc'],
    tipo: 'numero',
  },
  qtdPlacas: {
    label: 'Nº de placas / módulos',
    palavrasChave: ['placa', 'placas', 'modulo', 'módulo', 'modulos', 'módulos', 'qtd'],
    tipo: 'numero',
  },
  distanciaKm: {
    label: 'Distância da base (km)',
    palavrasChave: ['distância', 'distancia', ' km', 'quilometro', 'quilômetro'],
    tipo: 'numero',
  },
  plano: {
    label: 'Plano selecionado',
    palavrasChave: ['plano'],
    tipo: 'texto',
  },
  mensalidade: {
    label: 'Mensalidade recorrente',
    palavrasChave: ['mensalidade', 'recorrente', 'mensal'],
    tipo: 'numero',
  },
  valorTotalProposta: {
    label: 'Total 1ª cobrança',
    palavrasChave: ['primeira cobrança', '1ª cobrança', '1a cobrança', 'total proposta', 'total geral'],
    tipo: 'numero',
  },
  totalAvulsos: {
    label: 'Total serviços avulsos',
    palavrasChave: ['avulso', 'serviços avulsos', 'servicos avulsos', 'taxas avulsas'],
    tipo: 'numero',
  },
  valorTotalSistema: {
    label: 'Valor do sistema / investimento',
    palavrasChave: ['valor sistema', 'valor investimento', 'investimento', 'preco simulacao', 'preço simulação'],
    tipo: 'numero',
  },
  valorContrato: {
    label: 'Valor contrato (base seguro)',
    palavrasChave: ['contrato', 'seguro', 'valor contrato'],
    tipo: 'numero',
  },
  descricaoProposta: {
    label: 'Descrição / resumo da proposta',
    palavrasChave: ['descrição', 'descricao', 'resumo', 'proposta comercial', 'detalhamento'],
    tipo: 'texto_longo',
  },
  pdfProposta: {
    label: 'PDF da proposta',
    palavrasChave: ['pdf', 'arquivo proposta', 'proposta pdf'],
    tipo: 'arquivo',
  },
};

function extrairListaCampos(data) {
  if (data == null) return [];
  if (Array.isArray(data)) return data;

  for (const chave of ['list', 'List', 'items', 'Items', 'itens', 'Itens']) {
    if (Array.isArray(data[chave])) return data[chave];
  }

  return typeof data === 'object' ? [data] : [];
}

function normalizarCampoGroner(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const id = Number(raw.id ?? raw.Id);
  if (!id) return null;

  const titulo = String(raw.titulo ?? raw.Titulo ?? raw.nome ?? raw.Nome ?? '').trim();
  const tipo = raw.tipo ?? raw.Tipo ?? raw.tipoCampo ?? raw.TipoCampo ?? null;
  const codigo = raw.codigo ?? raw.Codigo ?? null;

  return { id, titulo, tipo, codigo };
}

export async function listarCamposPersonalizadosGroner({ paginasMax = 10 } = {}) {
  const campos = [];
  const vistos = new Set();

  for (let pagina = 1; pagina <= paginasMax; pagina += 1) {
    const data = await gronerFetch(
      `/CampoPersonalizado?pagina=${pagina}&tamanhoPagina=100&Ativo=true`,
    );
    const lote = extrairListaCampos(data).map(normalizarCampoGroner).filter(Boolean);

    if (!lote.length) break;

    for (const campo of lote) {
      if (vistos.has(campo.id)) continue;
      vistos.add(campo.id);
      campos.push(campo);
    }

    if (lote.length < 100) break;
  }

  return campos.sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));
}

function pontuarCampo(titulo, palavrasChave) {
  const texto = String(titulo ?? '').toLowerCase();
  if (!texto) return 0;

  let score = 0;
  for (const palavra of palavrasChave) {
    const chave = String(palavra).toLowerCase();
    if (texto === chave) score += 20;
    else if (texto.includes(chave)) score += 10;
  }
  return score;
}

export function sugerirMapeamentoCampos(camposGroner) {
  const sugestoes = {};

  for (const [chave, meta] of Object.entries(CATALOGO_CAMPOS_SYNC)) {
    const configuradoId = getCampoId(chave);
    let melhor = null;

    for (const campo of camposGroner) {
      const score = pontuarCampo(campo.titulo, meta.palavrasChave);
      if (score <= 0) continue;
      if (!melhor || score > melhor.score) {
        melhor = { ...campo, score };
      }
    }

    sugestoes[chave] = {
      chave,
      label: meta.label,
      tipo: meta.tipo,
      configuradoId: configuradoId || null,
      configurado: Boolean(configuradoId),
      sugestao: melhor
        ? { id: melhor.id, titulo: melhor.titulo, tipo: melhor.tipo, score: melhor.score }
        : null,
    };
  }

  return sugestoes;
}

export async function diagnosticarCamposGroner() {
  const camposGroner = await listarCamposPersonalizadosGroner();
  const configurados = getCamposConfigurados();
  const sugestoes = sugerirMapeamentoCampos(camposGroner);

  const pendentes = Object.values(sugestoes).filter((s) => !s.configurado);
  const prontos = Object.values(sugestoes).filter((s) => s.configurado);

  return {
    ok: true,
    totalCamposGroner: camposGroner.length,
    configurados,
    prontos: prontos.length,
    pendentes: pendentes.length,
    syncPronto: pendentes.length === 0,
    camposGroner,
    sugestoes,
  };
}

/** Gera trecho JSON para colar em config/groner-integracao.json */
export function gerarJsonCamposPersonalizados(sugestoes) {
  const ids = {};
  for (const [chave, item] of Object.entries(sugestoes)) {
    ids[chave] = item.configuradoId || item.sugestao?.id || 0;
  }
  return {
    camposPersonalizados: ids,
  };
}
