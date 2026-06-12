const { google } = require("googleapis");
const { requireAuth } = require("../lib/auth");

const LOGIN_SHEET = "LOGIN";
const HEADERS = ["Usuário", "Senha", "Nome", "Ativo"];

function getSheetsClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

function normalize(value) {
  return String(value || "").trim();
}

async function ensureLoginSheet(sheets, spreadsheetId) {
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = spreadsheet.data.sheets.some((sheet) => sheet.properties.title === LOGIN_SHEET);

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: LOGIN_SHEET } } }],
      },
    });
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${LOGIN_SHEET}!A1:D1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [HEADERS] },
  });
}

async function getUsers(sheets, spreadsheetId) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${LOGIN_SHEET}!A2:D`,
  }).catch(() => ({ data: { values: [] } }));

  return response.data.values || [];
}

module.exports = async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON || !process.env.SPREADSHEET_ID) {
    return res.status(500).json({ error: "Variáveis de ambiente não configuradas." });
  }

  try {
    const spreadsheetId = process.env.SPREADSHEET_ID;
    const sheets = getSheetsClient();
    await ensureLoginSheet(sheets, spreadsheetId);

    const users = await getUsers(sheets, spreadsheetId);
    const hasUsers = users.some((row) => row.some(Boolean));

    if (req.method === "GET") {
      return res.status(200).json({ hasUsers });
    }

    if (hasUsers && !requireAuth(req, res)) return;

    const { usuario, senha, nome } = req.body || {};
    const cleanUser = normalize(usuario);
    const cleanPassword = normalize(senha);
    const cleanName = normalize(nome);

    if (!cleanUser || !cleanPassword) {
      return res.status(400).json({ error: "Informe usuário e senha." });
    }

    const exists = users.some((row) => normalize(row[0]).toLowerCase() === cleanUser.toLowerCase());
    if (exists) {
      return res.status(409).json({ error: "Este usuário já existe." });
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${LOGIN_SHEET}!A:D`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[cleanUser, cleanPassword, cleanName || cleanUser, "Sim"]],
      },
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Acessos Sheets API error:", err);
    return res.status(500).json({ error: "Erro ao cadastrar acesso na planilha." });
  }
};
