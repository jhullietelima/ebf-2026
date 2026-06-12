const { google } = require("googleapis");
const { requireAuth } = require("../lib/auth");

const CLASSES = ["START", "UP", "GO"];

function getSheetsClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

function isPresent(value) {
  return String(value || "").trim().toLowerCase() === "sim";
}

function rowToPerson(row, classe, index) {
  return {
    id: `${classe}-${index}`,
    nome: row[0] || "",
    idade: row[1] || "",
    classe: row[2] || classe,
    responsavel: row[3] || "",
    telefone: row[4] || "",
    participante: row[5] || "",
    email: row[6] || "",
    observacao: row[7] || "",
    createdAt: row[8] || "",
    frequencia: {
      segunda: isPresent(row[9]),
      terca: isPresent(row[10]),
      quarta: isPresent(row[11]),
      quinta: isPresent(row[12]),
      sexta: isPresent(row[13]),
    },
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!requireAuth(req, res)) return;

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON || !process.env.SPREADSHEET_ID) {
    return res.status(500).json({ error: "Variáveis de ambiente não configuradas." });
  }

  try {
    const spreadsheetId = process.env.SPREADSHEET_ID;
    const sheets = getSheetsClient();
    const people = [];

    for (const classe of CLASSES) {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${classe}!A2:N`,
      }).catch(() => ({ data: { values: [] } }));

      const rows = response.data.values || [];
      rows.forEach((row, index) => {
        if (row.some(Boolean)) people.push(rowToPerson(row, classe, index));
      });
    }

    const counts = CLASSES.reduce((acc, classe) => {
      acc[classe] = people.filter((person) => person.classe === classe).length;
      return acc;
    }, {});

    counts.Membro = people.filter((person) => person.participante === "Membro").length;
    counts.Visitante = people.filter((person) => person.participante === "Visitante").length;
    counts.total = people.length;

    return res.status(200).json({ people, counts });
  } catch (err) {
    console.error("Sheets API error:", err);
    return res.status(500).json({ error: "Erro ao carregar inscritos." });
  }
};
