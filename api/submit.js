const { google } = require("googleapis");
const { requireAuth } = require("../lib/auth");

const CLASSES = ["START", "UP", "GO"];
const HEADERS = [
  "Nome",
  "Idade",
  "Classe",
  "Responsável",
  "Telefone",
  "Participante",
  "Email",
  "Observação",
  "Data",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
];

function getClassByAge(age) {
  const value = Number(age);
  if (Number.isInteger(value) && value >= 3 && value <= 5) return "START";
  if (Number.isInteger(value) && value >= 6 && value <= 11) return "UP";
  if (Number.isInteger(value) && value >= 12 && value <= 15) return "GO";
  return "";
}

function getSheetsClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

async function ensureClassSheet(sheets, spreadsheetId, sheetTitle) {
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = spreadsheet.data.sheets.some((sheet) => sheet.properties.title === sheetTitle);

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: sheetTitle } } }],
      },
    });
  }

  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetTitle}!A1:N1`,
  }).catch(() => ({ data: { values: [] } }));

  const headerValues = headerResponse.data.values?.[0] || [];
  if (headerValues.length < HEADERS.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetTitle}!A1:N1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [HEADERS] },
    });
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!requireAuth(req, res)) return;

  const {
    nome,
    email,
    idade,
    responsavel,
    telefone,
    participante,
    observacao,
  } = req.body || {};

  const sheetTitle = getClassByAge(idade);

  if (!nome) {
    return res.status(400).json({ error: "Nome é obrigatório." });
  }

  if (!sheetTitle || !CLASSES.includes(sheetTitle)) {
    return res.status(400).json({ error: "Idade deve estar entre 3 e 15 anos." });
  }

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON || !process.env.SPREADSHEET_ID) {
    return res.status(500).json({ error: "Variáveis de ambiente não configuradas." });
  }

  try {
    const spreadsheetId = process.env.SPREADSHEET_ID;
    const sheets = getSheetsClient();
    const createdAt = new Date().toLocaleString("pt-BR", { timeZone: "America/Belem" });

    await ensureClassSheet(sheets, spreadsheetId, sheetTitle);

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetTitle}!A:N`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            nome,
            idade || "",
            sheetTitle,
            responsavel || "",
            telefone || "",
            participante || "",
            email || "",
            observacao || "",
            createdAt,
            "",
            "",
            "",
            "",
            "",
          ],
        ],
      },
    });

    return res.status(200).json({ success: true, createdAt });
  } catch (err) {
    console.error("Sheets API error:", err);
    return res.status(500).json({ error: "Erro ao salvar na planilha." });
  }
};
