const { google } = require("googleapis");

export default async function handler(req, res) {
  // Só aceita POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { nome, email, telefone, observacao } = req.body;

  // Validação básica
  if (!nome || !email) {
    return res.status(400).json({ error: "Nome e e-mail são obrigatórios." });
  }

  try {
    // Autentica com a Service Account via variável de ambiente
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const spreadsheetId = process.env.SPREADSHEET_ID;

    // Append na primeira aba disponível
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Sheet1!A:D",
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
}
