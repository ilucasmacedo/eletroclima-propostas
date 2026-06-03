import precificacao from '../../config/precificacao.json' with { type: 'json' };

/** Texto exato das opções do campo radio Plano no CRM Groner */
export const PLANO_GRONER = {
  NENHUM: 'Sem plano',
  ...Object.fromEntries(
    Object.values(precificacao.planos).map((plano) => [plano.codigo, plano.nome]),
  ),
};

export function planoParaGroner(codigo) {
  const key = String(codigo ?? 'NENHUM').trim().toUpperCase();
  return PLANO_GRONER[key] ?? PLANO_GRONER.NENHUM;
}
