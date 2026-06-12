const { google } = require("googleapis");

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

function getRowNumber(id, classe) {
  const prefix = `${classe}-`;
  if (!String(id || "").startsWith(prefix)) return 0;

  const index = Number(String(id).slice(prefix.length));
  if (!Number.isInteger(index) || index < 0) return 0;

  return index + 2;
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

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetTitle}!A1:N1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [HEADERS] },
  });
}

async function getSheetId(sheets, spreadsheetId, sheetTitle) {
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = spreadsheet.data.sheets.find((item) => item.properties.title === sheetTitle);
  return sheet?.properties?.sheetId;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id, classe, idade, observacao } = req.body || {};
  const oldClass = String(classe || "").toUpperCase();
  const newClass = getClassByAge(idade);
  const rowNumber = getRowNumber(id, oldClass);

  if (!CLASSES.includes(oldClass) || !rowNumber) {
    return res.status(400).json({ error: "Inscrição inválida." });
  }

  if (!newClass) {
    return res.status(400).json({ error: "A idade deve estar entre 3 e 15 anos." });
  }

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON || !process.env.SPREADSHEET_ID) {
    return res.status(500).json({ error: "Variáveis de ambiente não configuradas." });
  }

  try {
    const spreadsheetId = process.env.SPREADSHEET_ID;
    const sheets = getSheetsClient();

    await ensureClassSheet(sheets, spreadsheetId, oldClass);

    const oldRowResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${oldClass}!A${rowNumber}:N${rowNumber}`,
    });
    const row = oldRowResponse.data.values?.[0];

    if (!row || !row.some(Boolean)) {
      return res.status(404).json({ error: "Inscrição não encontrada." });
    }

    while (row.length < HEADERS.length) row.push("");

    row[1] = idade;
    row[2] = newClass;
    row[7] = observacao || "";

    if (newClass === oldClass) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${oldClass}!A${rowNumber}:N${rowNumber}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [row] },
      });

      return res.status(200).json({ success: true, moved: false, classe: newClass });
    }

    await ensureClassSheet(sheets, spreadsheetId, newClass);

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${newClass}!A:N`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [row] },
    });

    const oldSheetId = await getSheetId(sheets, spreadsheetId, oldClass);
    if (oldSheetId === undefined) {
      return res.status(500).json({ error: "Aba de origem não encontrada." });
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: oldSheetId,
                dimension: "ROWS",
                startIndex: rowNumber - 1,
                endIndex: rowNumber,
              },
            },
          },
        ],
      },
    });

    return res.status(200).json({ success: true, moved: true, classe: newClass });
  } catch (err) {
    console.error("Sheets API error:", err);
    return res.status(500).json({ error: "Erro ao atualizar inscrição." });
  }
};
