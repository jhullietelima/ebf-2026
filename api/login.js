const { google } = require("googleapis");
const { AUTH_TTL_MS, createToken } = require("../lib/auth");

const LOGIN_SHEET = "LOGIN";

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

function isActive(value) {
  const status = normalize(value).toLowerCase();
  return !["nao", "não", "inativo", "bloqueado", "false", "0"].includes(status);
}

function rowToUser(row) {
  return {
    usuario: normalize(row[0]),
    senha: normalize(row[1]),
    nome: normalize(row[2]),
    ativo: isActive(row[3]),
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { usuario, senha } = req.body || {};
  const typedUser = normalize(usuario).toLowerCase();
  const typedPassword = normalize(senha);

  if (!typedUser || !typedPassword) {
    return res.status(400).json({ error: "Informe usuário e senha." });
  }

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON || !process.env.SPREADSHEET_ID) {
    return res.status(500).json({ error: "Variáveis de ambiente não configuradas." });
  }

  try {
    const sheets = getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: `${LOGIN_SHEET}!A2:D`,
    });

    const users = (response.data.values || []).map(rowToUser);
    const found = users.find((user) =>
      user.ativo &&
      user.usuario.toLowerCase() === typedUser &&
      user.senha === typedPassword
    );

    if (!found) {
      return res.status(401).json({ error: "Usuário ou senha inválidos." });
    }

    return res.status(200).json({
      token: createToken(found),
      user: { usuario: found.usuario, nome: found.nome || found.usuario },
      expiresIn: AUTH_TTL_MS,
    });
  } catch (err) {
    console.error("Login Sheets API error:", err);
    return res.status(500).json({ error: "Erro ao ler a aba LOGIN da planilha." });
  }
};
