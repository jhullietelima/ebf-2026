# PWA Cadastro → Google Sheets

PWA em HTML/CSS/JS puro com serverless function na Vercel que grava direto numa planilha do Google Sheets.

---

## Estrutura do projeto

```
pwa-sheets/
├── api/
│   └── submit.js          # Serverless function (Node.js)
├── public/
│   ├── index.html
│   ├── app.js
│   ├── sw.js              # Service Worker
│   ├── manifest.json      # PWA manifest
│   └── icons/
│       ├── icon-192.png   # ← você precisa adicionar
│       └── icon-512.png   # ← você precisa adicionar
├── vercel.json
├── package.json
└── README.md
```

---

## Passo a passo de configuração

### 1. Google Cloud — Service Account

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Crie um projeto (ou use um existente)
3. Ative a **Google Sheets API**: APIs & Services → Enable APIs → pesquise "Google Sheets API"
4. Crie uma **Service Account**: IAM & Admin → Service Accounts → Create
   - Nome: `pwa-sheets-bot` (qualquer nome)
   - Role: não precisa de role no projeto
5. Na service account criada, vá em **Keys → Add Key → JSON**
6. Salve o arquivo `.json` gerado (você vai precisar do conteúdo)

### 2. Google Sheets — Planilha

1. Crie uma planilha nova em [sheets.google.com](https://sheets.google.com)
2. Copie o **ID** da planilha da URL:
   ```
   https://docs.google.com/spreadsheets/d/  ← ESTE_É_O_ID  ←  /edit
   ```
3. Na planilha, clique em **Compartilhar** e adicione o e-mail da service account
   (ex: `pwa-sheets-bot@seu-projeto.iam.gserviceaccount.com`) com permissão de **Editor**
4. Na aba `Sheet1`, adicione os cabeçalhos na linha 1:
   ```
   A1: Nome   B1: Email   C1: Telefone   D1: Observação   E1: Data
   ```

### 3. Ícones PWA

Gere os ícones em [realfavicongenerator.net](https://realfavicongenerator.net) ou [maskable.app](https://maskable.app) e salve como:
- `public/icons/icon-192.png`
- `public/icons/icon-512.png`

### 4. Deploy na Vercel

1. Suba o projeto para um repositório GitHub
2. Acesse [vercel.com](https://vercel.com) → New Project → importe o repositório
3. Antes de dar o primeiro deploy, configure as **Environment Variables**:

| Nome | Valor |
|------|-------|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Cole o conteúdo inteiro do arquivo `.json` da service account (em uma linha) |
| `SPREADSHEET_ID` | O ID da planilha copiado no passo 2 |

4. Clique em **Deploy** — pronto!

---

## Como funciona

```
Usuário preenche o form
        ↓
POST /api/submit  (serverless function na Vercel)
        ↓
Google Sheets API  (autenticada via Service Account)
        ↓
Nova linha na planilha ✅
```

O frontend nunca vê as credenciais — ficam seguras nas env vars da Vercel.

---

## PWA — instalar no celular

Após o deploy, acesse a URL no Chrome (Android) ou Safari (iOS):
- **Android**: aparece banner "Adicionar à tela inicial" automaticamente
- **iOS**: Share → "Adicionar à Tela de Início"

O app funciona offline (mostra banner de aviso) e sincroniza quando voltar a internet.
