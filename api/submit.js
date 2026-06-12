const { google } = require("googleapis");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { nome, email, telefone, observacao } = req.body || {};

  if (!nome || !email) {
    return res.status(400).json({ error: "Nome e e-mail sao obrigatorios." });
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
      range: "Sheet1!A:E",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            nome,
            email,
            telefone || "",
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
