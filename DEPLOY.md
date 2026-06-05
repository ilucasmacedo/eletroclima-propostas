# Deploy — Vercel (recomendado)

**Use a Vercel em produção.** É o único ambiente onde as rotas `/api/groner/*` (integração CRM) funcionam.

| Onde | URL | Observação |
|------|-----|------------|
| **Vercel** | `https://eletroclima-propostas.vercel.app` (ou domínio próprio) | Build na raiz `/` — **API Groner** |
| **GitHub Pages** | Só se o repo for **público** ou conta **Pro** | Repositório atual é **privado** → Pages não habilita no plano gratuito |

---

## Vercel (passo a passo)

### Configuração inicial (uma vez)

1. Acesse [vercel.com](https://vercel.com) e entre com a conta GitHub.
2. **Add New → Project** → importe `ilucasmacedo/eletroclima-propostas`.
3. Deixe as opções padrão (Vite detectado automaticamente):
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Não** defina `BASE_PATH` — na Vercel o site roda na raiz.
4. Clique em **Deploy**.

Pronto. Cada `git push` no `main` dispara deploy na Vercel (se o projeto estiver importado).

**Produção atual:** https://eletroclima-propostas.vercel.app/

### Deploy manual (opcional)

Com a [CLI da Vercel](https://vercel.com/docs/cli) instalada:

```bash
npm i -g vercel
vercel --prod
```

---

## URLs úteis

| Página | Caminho |
|--------|---------|
| Propostas + Admin | `/` |
| CRM (fórmulas) | `/crm-painel.html` |

---

## Escalar para outro cliente (novo tenant Groner)

Pasta base em **`cliente-base/`** (só configs padrão) + script de cópia:

```bash
npm run novo-cliente -- \
  --dest "../OutroCliente/sistema" \
  --id acme \
  --nome "ACME Energia Solar" \
  --nome-curto ACME \
  --tenant acmeenergiasolar \
  --slug acme-propostas
```

Depois: edite `config/groner-integracao.json`, `config/precificacao.json`, `.env` e faça deploy em **repositório + Vercel separados**.

Guia: [`cliente-base/LEIA-ME.md`](cliente-base/LEIA-ME.md) · Checklist: [`cliente-base/CHECKLIST.md`](cliente-base/CHECKLIST.md)

Cada cliente usa **`config/cliente.json`** (marca, textos) — a MHZ já está configurada nesse arquivo.

---

## Desenvolvimento local

```bash
npm install
npm run dev
```

## Simular build do GitHub Pages (com subpasta)

No PowerShell:

```powershell
$env:BASE_PATH="/eletroclima-propostas/"
npm run build
npm run preview
```

Na Vercel, use `npm run build` sem `BASE_PATH`.

---

## GitHub Pages (opcional)

O workflow `.github/workflows/deploy.yml` só funciona se o Pages estiver habilitado em **Settings → Pages → GitHub Actions**. Em repositório **privado** no plano gratuito, o GitHub retorna erro *"plan does not support GitHub Pages"* — use só a Vercel.

Para publicar no Pages: torne o repo público **ou** use GitHub Pro, habilite Pages com source **GitHub Actions** e rode o workflow manualmente em **Actions**.

---

## Domínio próprio (opcional)

- **GitHub Pages:** Settings → Pages → Custom domain (e altere o workflow para `BASE_PATH: /`).
- **Vercel:** Project → Settings → Domains.

---

## Config do admin no servidor

Alterações no painel Admin ficam no `localStorage` do navegador. Para persistir para todos:

1. Admin → **Exportar JSON**
2. Substituir `config/precificacao.json` no repositório
3. Commit + push
