const { google } = require("googleapis");

const CLASSES = ["START", "UP", "GO"];
const HEADERS = [
  "Nome",
  "Idade",
  "Classe",
  "Responsavel",
  "Telefone",
  "Participante",
  "Email",
  "Observacao",
  "Data",
];

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
    range: `${sheetTitle}!A1:I1`,
  }).catch(() => ({ data: { values: [] } }));

  if (!headerResponse.data.values || !headerResponse.data.values.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetTitle}!A1:I1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [HEADERS] },
    });
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    nome,
    email,
    idade,
    classe,
    responsavel,
    telefone,
    participante,
    observacao,
  } = req.body || {};

  const sheetTitle = String(classe || "").toUpperCase();

  if (!nome) {
    return res.status(400).json({ error: "Nome e obrigatorio." });
  }

  if (!CLASSES.includes(sheetTitle)) {
    return res.status(400).json({ error: "Classe invalida." });
  }

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON || !process.env.SPREADSHEET_ID) {
    return res.status(500).json({ error: "Variaveis de ambiente nao configuradas." });
  }

  try {
    const spreadsheetId = process.env.SPREADSHEET_ID;
    const sheets = getSheetsClient();
    const createdAt = new Date().toLocaleString("pt-BR", { timeZone: "America/Belem" });

    await ensureClassSheet(sheets, spreadsheetId, sheetTitle);

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetTitle}!A:I`,
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
