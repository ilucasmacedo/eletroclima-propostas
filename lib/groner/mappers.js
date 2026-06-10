function apenasDigitos(valor) {
  return String(valor ?? '').replace(/\D/g, '');
}

function pickNumeroPositivo(...valores) {
  for (const valor of valores) {
    const numero = Number(valor);
    if (Number.isFinite(numero) && numero > 0) return numero;
  }
  return null;
}

function pickValor(...valores) {
  for (const valor of valores) {
    if (valor != null && valor !== '') return valor;
  }
  return null;
}

function pickNumeroInteiroPositivo(...valores) {
  for (const valor of valores) {
    const numero = Number(valor);
    if (Number.isFinite(numero) && numero > 0) return Math.round(numero);
  }
  return null;
}

function extrairQtdModulos(raw) {
  const direto = pickNumeroInteiroPositivo(
    raw.quantidadePlacas,
    raw.QuantidadePlacas,
    raw.quantidadeModulos,
    raw.QuantidadeModulos,
    raw.qtdModulos,
    raw.QtdModulos,
    raw.numeroModulos,
    raw.NumeroModulos,
    raw.totalModulos,
    raw.TotalModulos,
    raw.qtdPlacas,
    raw.QtdPlacas,
    raw.numeroPlacas,
    raw.NumeroPlacas,
  );
  if (direto) return direto;

  const objetosAninhados = [
    raw.kitFechado,
    raw.KitFechado,
    raw.kit,
    raw.Kit,
    raw.preProposta,
    raw.PreProposta,
    raw.simulacao,
    raw.Simulacao,
    raw.dadosKit,
    raw.DadosKit,
  ];

  for (const obj of objetosAninhados) {
    if (!obj || typeof obj !== 'object') continue;
    const valor = extrairQtdModulos(obj);
    if (valor) return valor;
  }

  const listasKit = [
    raw.kitsSelecionados,
    raw.KitsSelecionados,
    raw.kits,
    raw.Kits,
    raw.itensKit,
    raw.ItensKit,
  ];

  for (const lista of listasKit) {
    if (!Array.isArray(lista) || !lista.length) continue;

    let total = 0;
    for (const kit of lista) {
      if (!kit || typeof kit !== 'object') continue;

      const modulosKit = pickNumeroInteiroPositivo(
        kit.qtdModulos,
        kit.QtdModulos,
        kit.quantidadePlacas,
        kit.QuantidadePlacas,
        kit.quantidadeModulos,
        kit.QuantidadeModulos,
        kit.modulos,
        kit.Modulos,
      );

      if (!modulosKit) continue;

      const multiplicador = Number(kit.quantidade ?? kit.Quantidade ?? 1) || 1;
      total += modulosKit * multiplicador;
    }

    if (total > 0) return total;
  }

  return null;
}

export function combinarPropostaValores(...fontes) {
  const resultado = {
    potenciaKwp: null,
    qtdPlacas: null,
    precoSimulacao: null,
  };

  for (const fonte of fontes) {
    if (!fonte) continue;
    if (resultado.potenciaKwp == null && fonte.potenciaKwp != null) {
      resultado.potenciaKwp = fonte.potenciaKwp;
    }
    if (resultado.qtdPlacas == null && fonte.qtdPlacas != null) {
      resultado.qtdPlacas = fonte.qtdPlacas;
    }
    if (resultado.precoSimulacao == null && fonte.precoSimulacao != null) {
      resultado.precoSimulacao = fonte.precoSimulacao;
    }
  }

  return resultado;
}

/** Extrai kWp, valor e placas de PreProposta ou PrePropostaAceita */
export function mapPrePropostaValores(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const potenciaKwp = pickNumeroPositivo(
    raw.potenciaCc,
    raw.PotenciaCC,
    raw.PotenciaCc,
    raw.usinaPotenciaKwp,
    raw.UsinaPotenciaKwp,
    raw.potenciaKwp,
    raw.PotenciaKwp,
    raw.potencia,
    raw.Potencia,
    raw.potenciaModulos,
    raw.PotenciaModulos,
  );

  const qtdPlacas = extrairQtdModulos(raw);

  const precoBruto = pickValor(
    raw.precoSimulacao,
    raw.PrecoSimulacao,
    raw.precoSimulacaoAceita,
    raw.PrecoSimulacaoAceita,
    raw.valorTotal,
    raw.ValorTotal,
    raw.precoTotal,
    raw.PrecoTotal,
    raw.total,
    raw.Total,
    raw.valorProposta,
    raw.ValorProposta,
    raw.valorFinal,
    raw.ValorFinal,
  );

  const precoSimulacao =
    precoBruto != null ? (Number(precoBruto) || precoBruto) : null;

  if (potenciaKwp == null && qtdPlacas == null && precoSimulacao == null) {
    return null;
  }

  return { potenciaKwp, qtdPlacas, precoSimulacao };
}

/** Estimativa kWp a partir do consumo mensal (kWh) — referência mercado BR */
export function consumoParaKwp(consumoKwh) {
  const c = Number(consumoKwh);
  if (!c || c <= 0) return null;
  const kwp = c / 130;
  return Math.round(kwp * 100) / 100;
}

function montarEndereco(lead) {
  const e = lead.endereco ?? lead.Endereco ?? lead;
  const logradouro = e.logradouro ?? e.Logradouro ?? '';
  const numero = e.numero ?? e.Numero ?? '';
  const bairro = e.bairro ?? e.Bairro ?? '';
  const cidade = lead.cidade ?? lead.Cidade ?? e.cidade ?? e.Cidade ?? '';
  const uf = lead.uf ?? lead.UF ?? e.uf ?? e.UF ?? '';
  const cep = lead.cep ?? lead.CEP ?? e.cep ?? e.CEP ?? '';

  const rua = [logradouro, numero].filter(Boolean).join(', ');
  const local = [cidade, uf].filter(Boolean).join('/');
  const partes = [rua, bairro, local].filter(Boolean);

  return {
    logradouro,
    numero,
    bairro,
    cidade,
    uf,
    cep: apenasDigitos(cep),
    completo: partes.length ? partes.join(' — ') : '',
  };
}

export function mapProjetoDetalhe(p) {
  if (!p || typeof p !== 'object') return null;

  const id = p.id ?? p.Id ?? p.projetoId ?? p.ProjetoId;
  if (!id) return null;

  const consumo = p.consumo ?? p.Consumo ?? null;
  const potencia =
    p.usinaPotenciaKwp ??
    p.UsinaPotenciaKwp ??
    p.potenciaCc ??
    p.PotenciaCC ??
    p.PotenciaCc ??
    p.potenciaKwp ??
    p.PotenciaKwp ??
    p.potencia ??
    p.Potencia ??
    consumoParaKwp(consumo);

  return {
    id,
    nome: p.nome ?? p.Nome ?? p.nomeProjeto ?? p.NomeProjeto ?? 'Projeto',
    leadId: p.leadId ?? p.LeadId ?? p.idLead ?? p.IdLead ?? null,
    consumo,
    potenciaKwp: potencia,
    descricao: p.descricao ?? p.Descricao ?? '',
    nota: p.nota ?? p.Nota ?? '',
    tipoProjetoId: p.tipoProjetoId ?? p.TipoProjetoId ?? null,
    statusId: p.statusId ?? p.StatusId ?? null,
    qtdPlacas:
      extrairQtdModulos(p) ??
      pickNumeroInteiroPositivo(p.quantidadePlacas, p.QuantidadePlacas) ??
      null,
    precoSimulacao:
      p.precoSimulacao ??
      p.PrecoSimulacao ??
      p.precoSimulacaoAceita ??
      p.PrecoSimulacaoAceita ??
      p.valorTotal ??
      p.ValorTotal ??
      null,
    propostaFonte: p.propostaFonte ?? null,
    propostaId: p.propostaId ?? null,
  };
}

export function mapLeadDetalhe(raw) {
  const lead = raw?.lead ?? raw;
  if (!lead?.id && !lead?.Id) return null;

  const endereco = montarEndereco(lead);
  const consumoLead = lead.consumo ?? lead.Consumo ?? null;

  const projetos = (lead.projetos ?? lead.Projetos ?? [])
    .map(mapProjetoDetalhe)
    .filter(Boolean);

  return {
    id: lead.id ?? lead.Id,
    nome: lead.nome ?? lead.Nome ?? '',
    email: lead.email ?? lead.Email ?? '',
    documento: lead.documento ?? lead.Documento ?? '',
    telefone: lead.celular ?? lead.Celular ?? lead.telefone ?? lead.Telefone ?? '',
    ddi: lead.ddiCelular ?? lead.DDICelular ?? '55',
    tipo: lead.tipo ?? lead.Tipo ?? null,
    consumo: consumoLead,
    endereco,
    projetos,
  };
}

export function montarPayloadFormulario(lead, projeto) {
  const consumo = projeto?.consumo ?? lead?.consumo ?? null;
  const kwp = projeto?.potenciaKwp ?? consumoParaKwp(consumo);

  return {
    cliente: {
      nome: lead.nome,
      documento: lead.documento,
      email: lead.email,
      telefone: lead.telefone,
    },
    usina: {
      kwp: kwp ?? undefined,
      qtdPlacas: projeto?.qtdPlacas ?? undefined,
      endereco: lead.endereco?.completo || projeto?.descricao || undefined,
      consumoKwh: consumo ?? undefined,
    },
    groner: {
      leadId: lead.id,
      projetoId: projeto?.id ?? null,
      projetoNome: projeto?.nome ?? null,
      precoSimulacao: projeto?.precoSimulacao ?? null,
      qtdPlacasProjeto: projeto?.qtdPlacas ?? null,
      propostaFonte: projeto?.propostaFonte ?? null,
      propostaId: projeto?.propostaId ?? null,
    },
    meta: {
      descricaoProjeto: projeto?.descricao ?? '',
      notaProjeto: projeto?.nota ?? '',
    },
  };
}
