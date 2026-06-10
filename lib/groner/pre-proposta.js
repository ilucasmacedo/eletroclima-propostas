import { gronerFetch } from './http.js';
import { mapPrePropostaValores } from './mappers.js';

function extrairListaPrePropostas(projetoRaw) {
  if (!projetoRaw || typeof projetoRaw !== 'object') return [];

  const chaves = [
    'prePropostas',
    'PrePropostas',
    'prePropostaList',
    'PrePropostaList',
    'simulacoes',
    'Simulacoes',
  ];

  for (const chave of chaves) {
    const lista = projetoRaw[chave];
    if (Array.isArray(lista) && lista.length) return lista;
  }

  return [];
}

function escolherUltimaPreProposta(lista) {
  if (!Array.isArray(lista) || !lista.length) return null;

  const ordenada = [...lista].sort((a, b) => {
    const dataA = Date.parse(
      a.dataCadastro ?? a.DataCadastro ?? a.dataAlteracao ?? a.DataAlteracao ?? '',
    );
    const dataB = Date.parse(
      b.dataCadastro ?? b.DataCadastro ?? b.dataAlteracao ?? b.DataAlteracao ?? '',
    );
    const idA = Number(a.id ?? a.Id ?? 0);
    const idB = Number(b.id ?? b.Id ?? 0);

    if (Number.isFinite(dataB) && Number.isFinite(dataA) && dataB !== dataA) {
      return dataB - dataA;
    }

    return idB - idA;
  });

  return ordenada[0] ?? null;
}

function extrairItensLista(data) {
  if (data == null) return [];
  if (Array.isArray(data)) return data;

  for (const chave of ['list', 'List', 'items', 'Items', 'itens', 'Itens']) {
    if (Array.isArray(data[chave])) return data[chave];
  }

  return typeof data === 'object' ? [data] : [];
}

function temDadosProposta(valores) {
  return Boolean(
    valores &&
      (valores.potenciaKwp != null ||
        valores.qtdPlacas != null ||
        valores.precoSimulacao != null),
  );
}

async function obterPrePropostaAceitaPorProjeto(projetoId) {
  try {
    const data = await gronerFetch(`/PrePropostaAceita/Projeto/${projetoId}`);
    const item = extrairItensLista(data)[0] ?? data;
    const valores = mapPrePropostaValores(item);

    if (!temDadosProposta(valores)) return null;

    return {
      ...valores,
      id: item?.id ?? item?.Id ?? null,
      fonte: 'aceita',
    };
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

async function obterPrePropostaPorId(id) {
  if (!id) return null;

  try {
    const data = await gronerFetch(`/PreProposta/${id}`);
    const valores = mapPrePropostaValores(data);
    if (!temDadosProposta(valores)) return null;

    return {
      ...valores,
      id: data?.id ?? data?.Id ?? id,
      fonte: 'ultima',
    };
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

async function obterUltimaPrePropostaPorProjeto(projetoId, projetoRaw) {
  const embedded = escolherUltimaPreProposta(extrairListaPrePropostas(projetoRaw));
  if (embedded) {
    const resumo = mapPrePropostaValores(embedded);
    const id = embedded.id ?? embedded.Id;

    if (temDadosProposta(resumo)) {
      return { ...resumo, id, fonte: 'ultima' };
    }

    const detalhe = await obterPrePropostaPorId(id);
    if (detalhe) return detalhe;
  }

  const referenciaId =
    projetoRaw?.ultimaPrePropostaId ??
    projetoRaw?.UltimaPrePropostaId ??
    projetoRaw?.prePropostaId ??
    projetoRaw?.PrePropostaId ??
    projetoRaw?.prePropostaAceitaId ??
    projetoRaw?.PrePropostaAceitaId;

  const porReferencia = await obterPrePropostaPorId(referenciaId);
  if (porReferencia) return porReferencia;

  try {
    const data = await gronerFetch(
      `/PreProposta?projetoId=${projetoId}&pagina=1&tamanhoPagina=25`,
    );
    const lista = extrairItensLista(data).filter(
      (item) => Number(item?.projetoId ?? item?.ProjetoId) === Number(projetoId),
    );
    const ultima = escolherUltimaPreProposta(lista.length ? lista : extrairItensLista(data));
    if (!ultima) return null;

    const resumo = mapPrePropostaValores(ultima);
    const id = ultima.id ?? ultima.Id;

    if (temDadosProposta(resumo)) {
      return { ...resumo, id, fonte: 'ultima' };
    }

    return obterPrePropostaPorId(id);
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

/**
 * Prioridade: proposta aceita do negócio → última pré-proposta gerada.
 * Endpoints: GET /PrePropostaAceita/Projeto/{id} e GET /PreProposta/{id}
 */
export async function obterDadosPropostaNegocio(projetoId, projetoRaw = null) {
  const pid = Number(projetoId);
  if (!pid) return null;

  const aceita = await obterPrePropostaAceitaPorProjeto(pid);
  if (aceita) return aceita;

  return obterUltimaPrePropostaPorProjeto(pid, projetoRaw);
}
