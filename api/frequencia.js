const { google } = require("googleapis");
const { requireAuth } = require("../lib/auth");

const CLASSES = ["START", "UP", "GO"];
const DAYS = ["segunda", "terca", "quarta", "quinta", "sexta"];
const DAY_HEADERS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];

function getSheetsClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

function getRowNumber(id, classe) {
  const prefix = `${classe}-`;
  if (!String(id || "").startsWith(prefix)) return 0;

  const index = Number(String(id).slice(prefix.length));
  if (!Number.isInteger(index) || index < 0) return 0;

  return index + 2;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!requireAuth(req, res)) return;

  const { id, classe, frequencia } = req.body || {};
  const sheetTitle = String(classe || "").toUpperCase();
  const rowNumber = getRowNumber(id, sheetTitle);

  if (!CLASSES.includes(sheetTitle) || !rowNumber) {
    return res.status(400).json({ error: "Inscrito inválido." });
  }

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON || !process.env.SPREADSHEET_ID) {
    return res.status(500).json({ error: "Variáveis de ambiente não configuradas." });
  }

  try {
    const sheets = getSheetsClient();
    const values = DAYS.map((day) => frequencia?.[day] ? "Sim" : "");

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: `${sheetTitle}!J1:N1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [DAY_HEADERS] },
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: `${sheetTitle}!J${rowNumber}:N${rowNumber}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [values] },
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Sheets API error:", err);
    return res.status(500).json({ error: "Erro ao salvar frequência." });
  }
};
