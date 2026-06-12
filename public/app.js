if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

const STORAGE_KEY = "ebf2026-inscritos";
const samplePeople = [
  { id: "sample-1", nome: "Maria Eduarda", idade: "7", classe: "UP", responsavel: "Luciana Silva", telefone: "(91) 99999-9999", participante: "Visitante", createdAt: "20/05/2026 - 09:15" },
  { id: "sample-2", nome: "Joao Pedro", idade: "5", classe: "START", responsavel: "Carlos Santos", telefone: "(91) 98888-1111", participante: "Membro", createdAt: "20/05/2026 - 09:22" },
  { id: "sample-3", nome: "Ana Clara", idade: "10", classe: "GO", responsavel: "Paula Costa", telefone: "(91) 97777-2222", participante: "Visitante", createdAt: "20/05/2026 - 09:36" },
  { id: "sample-4", nome: "Davi Lucas", idade: "6", classe: "UP", responsavel: "Marcos Lima", telefone: "(91) 96666-3333", participante: "Membro", createdAt: "20/05/2026 - 10:01" },
  { id: "sample-5", nome: "Isabella Vitoria", idade: "8", classe: "UP", responsavel: "Renata Alves", telefone: "(91) 95555-4444", participante: "Visitante", createdAt: "20/05/2026 - 10:18" },
  { id: "sample-6", nome: "Miguel Henrique", idade: "4", classe: "START", responsavel: "Bruna Rocha", telefone: "(91) 94444-5555", participante: "Membro", createdAt: "20/05/2026 - 10:24" },
];

let savedPeople = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

const toastEl = document.getElementById("toast");
const offlineBanner = document.getElementById("offlineBanner");
const form = document.getElementById("cadastroForm");
const submitBtn = document.getElementById("submitBtn");
const spinner = document.getElementById("spinner");
const btnText = document.getElementById("btnText");
const searchInput = document.getElementById("searchInput");
let toastTimer;

function allPeople() {
  return [...savedPeople, ...samplePeople];
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPeople));
}

function showToast(message, type = "success") {
  clearTimeout(toastTimer);
  toastEl.textContent = message;
  toastEl.className = `toast ${type} show`;
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3200);
}

function updateOnlineStatus() {
  offlineBanner.classList.toggle("visible", !navigator.onLine);
}

function classIcon(classe) {
  if (classe === "START") return "&#11088;";
  if (classe === "GO") return "&#9812;";
  return "&#128640;";
}

function pillClass(classe) {
  return classe === "START" ? "start" : classe === "GO" ? "go" : "";
}

function getCounts() {
  const people = allPeople();
  const counts = {
    START: people.filter((p) => p.classe === "START").length,
    UP: people.filter((p) => p.classe === "UP").length,
    GO: people.filter((p) => p.classe === "GO").length,
    Membro: people.filter((p) => p.participante === "Membro").length,
    Visitante: people.filter((p) => p.participante === "Visitante").length,
  };
  counts.total = people.length;
  return counts;
}

function statCard(icon, label, value) {
  return `
    <article class="stat-card">
      <div class="icon">${icon}</div>
      <div><strong>${label}</strong><span class="number">${value}</span><small>inscritos</small></div>
    </article>
  `;
}

function renderStats() {
  const counts = getCounts();
  document.getElementById("homeStats").innerHTML = [
    statCard("&#11088;", "START", counts.START),
    statCard("&#128640;", "UP", counts.UP),
    statCard("&#9812;", "GO", counts.GO),
    statCard("&#128101;", "Total geral", counts.total),
  ].join("");

  document.getElementById("participantStats").innerHTML = [
    statCard("&#128101;", "Visitantes", counts.Visitante),
    statCard("&#128101;", "Membros", counts.Membro),
  ].join("");

  document.getElementById("totalCard").innerHTML = `<div class="icon">&#128101;</div><div><strong>Total geral</strong><span class="number">${counts.total}</span><small>inscritos</small></div>`;
  document.getElementById("reportTotal").textContent = counts.total;
  document.getElementById("reportLegend").innerHTML = [
    legendRow("", "START", counts.START, counts.total),
    legendRow("up", "UP", counts.UP, counts.total),
    legendRow("go", "GO", counts.GO, counts.total),
  ].join("");
}

function legendRow(className, label, count, total) {
  const base = total || 1;
  const percent = Math.round((count / base) * 100);
  return `<div class="legend-row"><span class="legend-dot ${className}"></span><span>${label}</span><strong>${count} (${percent}%)</strong></div>`;
}

function renderList() {
  const term = searchInput.value.trim().toLowerCase();
  const people = allPeople().filter((person) => person.nome.toLowerCase().includes(term));
  const list = document.getElementById("personList");

  if (!people.length) {
    list.innerHTML = `<article class="panel">Nenhum inscrito encontrado.</article>`;
    return;
  }

  list.innerHTML = people.map((person) => `
    <article class="person-card">
      <div class="avatar">&#128522;</div>
      <div>
        <div class="person-name">${person.nome}</div>
        <div class="person-age">${person.idade} anos - ${person.responsavel}</div>
      </div>
      <div>
        <span class="pill ${pillClass(person.classe)}">${person.classe}</span>
        <span class="tag">${person.participante}</span>
      </div>
    </article>
  `).join("");
}

function renderAll() {
  renderStats();
  renderList();
}

function setLoading(loading) {
  submitBtn.disabled = loading;
  spinner.hidden = !loading;
  btnText.textContent = loading ? "Salvando..." : "Salvar inscricao";
}

function formDataToRecord() {
  return {
    id: `local-${Date.now()}`,
    nome: form.nome.value.trim(),
    email: form.email.value,
    idade: form.idade.value.trim(),
    classe: form.classe.value,
    responsavel: form.responsavel.value.trim(),
    telefone: form.telefone.value.trim(),
    participante: form.participante.value,
    observacao: "",
    createdAt: new Date().toLocaleString("pt-BR", {
      timeZone: "America/Belem",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).replace(",", " -"),
  };
}

function validate(record) {
  if (!record.nome) return "Informe o nome da crianca.";
  if (!record.idade) return "Informe a idade.";
  if (!record.responsavel) return "Informe o responsavel.";
  if (!record.telefone) return "Informe o telefone.";
  return "";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const record = formDataToRecord();
  const error = validate(record);
  if (error) {
    showToast(error, "error");
    return;
  }

  setLoading(true);

  try {
    const res = await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao salvar.");

    savedPeople.unshift(record);
    persist();
    form.reset();
    renderAll();
    showToast("Inscricao salva com sucesso.");
    document.getElementById("inscritos").scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    showToast(err.message || "Nao foi possivel salvar na planilha.", "error");
  } finally {
    setLoading(false);
  }
});

searchInput.addEventListener("input", renderList);
window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);

document.getElementById("exportBtn").addEventListener("click", () => {
  const header = ["Nome", "Idade", "Classe", "Responsavel", "Telefone", "Participante", "Data"];
  const rows = allPeople().map((p) => [p.nome, p.idade, p.classe, p.responsavel, p.telefone, p.participante, p.createdAt]);
  const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "inscritos-ebf-2026.csv";
  link.click();
  URL.revokeObjectURL(url);
});

updateOnlineStatus();
renderAll();
