import html2pdf from 'html2pdf.js';
import {
  LOGO_ALT,
  getRodapePdf,
  getVendedorPadrao,
  getSubtituloProposta,
  getTituloPropostaPdf,
  getFormasPagamentoPdf,
  getLogoHtmlPdf,
} from './cliente-config.js';
import { getFormasPagamento } from './pricing.js';

const PDF_RENDER_ID = 'pdf-render-host';

function getHtml2Pdf() {
  return typeof html2pdf === 'function' ? html2pdf : html2pdf.default;
}

function getRenderHost() {
  let host = document.getElementById(PDF_RENDER_ID);
  if (!host) {
    host = document.createElement('div');
    host.id = PDF_RENDER_ID;
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText =
      'position:fixed;left:-10000px;top:0;width:794px;max-width:794px;background:#fff;pointer-events:none;';
    document.body.appendChild(host);
  }
  return host;
}

async function aguardarImagens(elemento) {
  const imgs = elemento.querySelectorAll('img');
  if (!imgs.length) return;
  await Promise.all(
    Array.from(imgs).map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', () => resolve(), { once: true });
        }),
    ),
  );
}

async function aguardarRender(elemento) {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
  if (elemento) {
    await aguardarImagens(elemento);
  }
  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

function pdfOptions(nomeArquivo) {
  return {
    margin: [10, 10, 10, 10],
    filename: nomeArquivo,
    image: { type: 'jpeg', quality: 0.92 },
    html2canvas: {
      scale: 1.5,
      useCORS: true,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      width: 794,
      logging: false,
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'] },
  };
}

/** Gera PDF em memória (para enviar à Groner) */
export async function gerarPropostaPdfBlob(elemento) {
  if (!elemento) {
    throw new Error('Elemento da proposta não encontrado.');
  }

  const host = getRenderHost();
  host.innerHTML = '';
  const clone = elemento.cloneNode(true);
  clone.style.width = '100%';
  host.appendChild(clone);

  await aguardarRender(clone);

  const gerarPdf = getHtml2Pdf();
  if (typeof gerarPdf !== 'function') {
    host.innerHTML = '';
    throw new Error('Biblioteca de PDF indisponível.');
  }

  try {
    return await gerarPdf().set(pdfOptions('proposta.pdf')).from(clone).outputPdf('blob');
  } finally {
    host.innerHTML = '';
  }
}

export async function exportarPropostaPdf(elemento, nomeArquivo) {
  const blob = await gerarPropostaPdfBlob(elemento);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}

function descricaoItemCliente(item) {
  if (item.tipo === 'DESLOCAMENTO' || item.codigo === 'DESLOCAMENTO') {
    return 'Taxa de deslocamento';
  }
  return item.descricao;
}

function formasPagamentoProposta() {
  const doConfig = getFormasPagamento().filter((f) => !/recorrente/i.test(f));
  if (doConfig.length) return doConfig;
  return getFormasPagamentoPdf();
}

export function montarHtmlProposta(dados) {
  const {
    numeroProposta,
    dataEmissao,
    validadeDias,
    cliente,
    usina,
    plano,
    resultado,
    vendedor,
  } = dados;

  const dataValidade = new Date(dataEmissao);
  dataValidade.setDate(dataValidade.getDate() + validadeDias);

  const formatDate = (d) =>
    new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(d);

  const formatMoeda = (v) =>
    v === null || v === undefined
      ? 'Sob consulta'
      : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const itensHtml = resultado.itens
    .map(
      (item) => `
      <tr>
        <td>${descricaoItemCliente(item)}</td>
        <td class="valor">${formatMoeda(item.subtotal)}</td>
      </tr>`,
    )
    .join('');

  const alertaSobConsulta = resultado.sob_consulta
    ? `<div class="alerta">⚠ Parte desta proposta requer valores sob consulta comercial.</div>`
    : '';

  return `
    <div class="pdf-proposta">
      <header class="pdf-header">
        <div class="pdf-brand">
          ${getLogoHtmlPdf()}
          <div class="pdf-titulo-doc">
            <h1>${getTituloPropostaPdf()}</h1>
            <p class="pdf-subtitulo-doc">${getSubtituloProposta()}</p>
          </div>
        </div>
        <div class="pdf-meta">
          <p><strong>Nº:</strong> ${numeroProposta}</p>
          <p><strong>Emissão:</strong> ${formatDate(dataEmissao)}</p>
          <p><strong>Validade:</strong> ${formatDate(dataValidade)}</p>
        </div>
      </header>

      ${alertaSobConsulta}

      <section class="pdf-section">
        <h2>Dados do Cliente</h2>
        <div class="pdf-grid">
          <p><span>Nome:</span> ${cliente.nome}</p>
          <p><span>CPF/CNPJ:</span> ${cliente.documento || '—'}</p>
          <p><span>E-mail:</span> ${cliente.email || '—'}</p>
          <p><span>Telefone:</span> ${cliente.telefone || '—'}</p>
        </div>
      </section>

      <section class="pdf-section">
        <h2>Plano Selecionado</h2>
        <div class="pdf-plano-box">
          <h3>${plano.nome}</h3>
          <p class="pdf-plano-valor">${plano.nome === 'Sem plano' ? '—' : `${formatMoeda(resultado.totais.recorrente_mensal)}<span>/mês</span>`}</p>
          <p class="pdf-plano-faixa">${plano.nome === 'Sem plano' ? 'Contratação apenas de serviços avulsos' : `Faixa: ${plano.faixa}`}</p>
        </div>
      </section>

      <section class="pdf-section">
        <h2>Detalhamento</h2>
        <table class="pdf-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            ${itensHtml || '<tr><td colspan="2">Apenas mensalidade do plano</td></tr>'}
          </tbody>
        </table>
      </section>

      <section class="pdf-totais">
        <div class="pdf-total-row">
          <span>Mensalidade recorrente</span>
          <strong>${plano.nome === 'Sem plano' ? '—' : formatMoeda(resultado.totais.recorrente_mensal)}</strong>
        </div>
        <div class="pdf-total-row">
          <span>Serviços e taxas (avulsos)</span>
          <strong>${formatMoeda(resultado.totais.avulsos)}</strong>
        </div>
        <div class="pdf-total-row destaque">
          <span>Valor total</span>
          <strong>${formatMoeda(resultado.totais.primeira_cobranca)}</strong>
        </div>
      </section>

      <section class="pdf-section pdf-obs">
        <h2>Condições</h2>
        <ul>
          <li>Proposta válida por ${validadeDias} dias a partir da emissão.</li>
        </ul>
        <h2>Formas de pagamento</h2>
        <ul>
          ${formasPagamentoProposta().map((f) => `<li>${f}</li>`).join('')}
        </ul>
      </section>

      <footer class="pdf-footer">
        <p>Vendedor: ${vendedor || getVendedorPadrao()}</p>
        <p>${getRodapePdf()}</p>
      </footer>
    </div>
  `;
}
