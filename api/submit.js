const { google } = require("googleapis");

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

  if (!nome) {
    return res.status(400).json({ error: "Nome e obrigatorio." });
  }

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON || !process.env.SPREADSHEET_ID) {
    return res.status(500).json({ error: "Variaveis de ambiente nao configuradas." });
  }

  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: "A:I",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            nome,
            idade || "",
            classe || "",
            responsavel || "",
            telefone || "",
            participante || "",
            email || "",
            observacao || "",
            new Date().toLocaleString("pt-BR", { timeZone: "America/Belem" }),
          ],
        ],
      },
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Sheets API error:", err);
    return res.status(500).json({ error: "Erro ao salvar na planilha." });
  }
};
