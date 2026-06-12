if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

let people = [];
let lastLoadedAt = "";

const toastEl = document.getElementById("toast");
const offlineBanner = document.getElementById("offlineBanner");
const form = document.getElementById("cadastroForm");
const submitBtn = document.getElementById("submitBtn");
const spinner = document.getElementById("spinner");
const btnText = document.getElementById("btnText");
const searchInput = document.getElementById("searchInput");
const refreshBtn = document.getElementById("refreshBtn");
const idadeInput = document.getElementById("idade");
const classeInput = document.getElementById("classe");
const classShape = document.getElementById("classShape");
const classPreview = document.getElementById("classPreview");
let toastTimer;

function showToast(message, type = "success") {
  clearTimeout(toastTimer);
  toastEl.textContent = message;
  toastEl.className = `toast ${type} show`;
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3200);
}

function updateOnlineStatus() {
  offlineBanner.classList.toggle("visible", !navigator.onLine);
}

function pillClass(classe) {
  return classe === "START" ? "start" : classe === "GO" ? "go" : "";
}

function getClassByAge(age) {
  const value = Number(age);
  if (value >= 3 && value <= 5) return "START";
  if (value >= 6 && value <= 11) return "UP";
  if (value >= 12 && value <= 15) return "GO";
  return "";
}

function updateClassPreview() {
  const classe = getClassByAge(idadeInput.value);

  classeInput.value = classe;
  classShape.className = `group-shape ${classe ? classe.toLowerCase() : "empty"}`;
  classPreview.textContent = classe || "Grupo";
}

function getCounts() {
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
      <div class="stat-icon">${icon}</div>
      <div><strong>${label}</strong><span class="number">${value}</span><small>inscritos</small></div>
    </article>
  `;
}

function totalIcon() {
  return '<span class="total-shape" aria-hidden="true"><span></span><span></span><span></span><span></span></span>';
}

function renderStats() {
  const counts = getCounts();
  document.getElementById("homeStats").innerHTML = [
    statCard('<span class="group-shape start"></span>', "START", counts.START),
    statCard('<span class="group-shape up"></span>', "UP", counts.UP),
    statCard('<span class="group-shape go"></span>', "GO", counts.GO),
    statCard(totalIcon(), "Total geral", counts.total),
  ].join("");

  document.getElementById("participantStats").innerHTML = [
    statCard('<span class="icon">&#128101;</span>', "Visitantes", counts.Visitante),
    statCard('<span class="icon">&#128101;</span>', "Membros", counts.Membro),
  ].join("");

  document.getElementById("totalCard").innerHTML = `<div class="stat-icon">${totalIcon()}</div><div><strong>Total geral</strong><span class="number">${counts.total}</span><small>inscritos</small></div>`;
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
  const filtered = people.filter((person) => person.nome.toLowerCase().includes(term));
  const list = document.getElementById("personList");

  if (!people.length) {
    list.innerHTML = `<article class="panel">Ainda não há inscritos carregados da planilha.</article>`;
    return;
  }

  if (!filtered.length) {
    list.innerHTML = `<article class="panel">Nenhum inscrito encontrado.</article>`;
    return;
  }

  list.innerHTML = filtered.map((person) => `
    <article class="person-card">
      <div class="avatar">&#128522;</div>
      <div>
        <div class="person-name">${person.nome}</div>
        <div class="person-age">${person.idade || "-"} anos - ${person.responsavel || "Responsável não informado"}</div>
        <div class="person-age">${person.telefone || ""}</div>
      </div>
      <div>
        <span class="pill ${pillClass(person.classe)}">${person.classe}</span>
        <span class="tag">${person.participante || "Participante"}</span>
      </div>
    </article>
  `).join("");
}

function renderClassLists() {
  const classList = document.getElementById("classLists");

  classList.innerHTML = ["START", "UP", "GO"].map((classe) => {
    const classPeople = people.filter((person) => person.classe === classe);
    const names = classPeople.length
      ? classPeople.map((person) => `<li>${person.nome} <span>${person.idade || "-"} anos</span></li>`).join("")
      : "<li>Nenhum inscrito ainda</li>";

    return `
      <article class="panel class-panel">
        <h3>${classe}</h3>
        <strong>${classPeople.length} inscritos</strong>
        <ul>${names}</ul>
      </article>
    `;
  }).join("");
}

function renderLoadedStatus() {
  const status = document.getElementById("loadedStatus");
  status.textContent = lastLoadedAt
    ? `Dados carregados da planilha às ${lastLoadedAt}`
    : "Carregando dados da planilha...";
}

function renderAll() {
  renderStats();
  renderList();
  renderClassLists();
  renderLoadedStatus();
}

async function loadPeople({ silent = false } = {}) {
  try {
    if (refreshBtn) refreshBtn.disabled = true;
    const res = await fetch("/api/inscritos");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao carregar inscritos.");

    people = data.people || [];
    lastLoadedAt = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    renderAll();
    if (!silent) showToast("Lista atualizada com a planilha.");
  } catch (err) {
    renderAll();
    if (!silent) showToast(err.message || "Não foi possível carregar a planilha.", "error");
  } finally {
    if (refreshBtn) refreshBtn.disabled = false;
  }
}

function setLoading(loading) {
  submitBtn.disabled = loading;
  spinner.hidden = !loading;
  btnText.textContent = loading ? "Salvando..." : "Salvar inscrição";
}

function formDataToRecord() {
  const classe = getClassByAge(form.idade.value);

  return {
    nome: form.nome.value.trim(),
    email: form.email.value,
    idade: form.idade.value.trim(),
    classe,
    responsavel: form.responsavel.value.trim(),
    telefone: form.telefone.value.trim(),
    participante: form.participante.value,
    observacao: "",
  };
}

function validate(record) {
  const age = Number(record.idade);

  if (!record.nome) return "Informe o nome da criança.";
  if (!record.idade) return "Informe a idade.";
  if (!Number.isInteger(age) || age < 3 || age > 15) return "A idade deve estar entre 3 e 15 anos.";
  if (!record.classe) return "Não foi possível identificar o grupo pela idade.";
  if (!record.responsavel) return "Informe o responsável.";
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

    form.reset();
    updateClassPreview();
    showToast(`Inscrição salva na aba ${record.classe}.`);
    await loadPeople({ silent: true });
    document.getElementById("inscritos").scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    showToast(err.message || "Não foi possível salvar na planilha.", "error");
  } finally {
    setLoading(false);
  }
});

searchInput.addEventListener("input", renderList);
refreshBtn.addEventListener("click", () => loadPeople());
idadeInput.addEventListener("input", updateClassPreview);
window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);

document.getElementById("exportBtn").addEventListener("click", () => {
  const header = ["Nome", "Idade", "Classe", "Responsável", "Telefone", "Participante", "Data"];
  const rows = people.map((p) => [p.nome, p.idade, p.classe, p.responsavel, p.telefone, p.participante, p.createdAt]);
  const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "inscritos-ebf-2026.csv";
  link.click();
  URL.revokeObjectURL(url);
});

updateOnlineStatus();
updateClassPreview();
renderAll();
loadPeople({ silent: true });
