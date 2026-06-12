if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

let people = [];
let lastLoadedAt = "";
let selectedPersonId = "";
let toastTimer;
let peoplePage = 0;

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
const personList = document.getElementById("personList");
const childModal = document.getElementById("childModal");
const modalBody = document.getElementById("modalBody");
const modalChildName = document.getElementById("modalChildName");
const modalClose = document.getElementById("modalClose");
const recentCount = document.getElementById("recentCount");
const listPager = document.getElementById("listPager");
const prevPeoplePage = document.getElementById("prevPeoplePage");
const nextPeoplePage = document.getElementById("nextPeoplePage");
const peoplePageStatus = document.getElementById("peoplePageStatus");

const PEOPLE_PAGE_SIZE = 4;
const ATTENDANCE_DAYS = [
  { key: "segunda", label: "Seg" },
  { key: "terca", label: "Ter" },
  { key: "quarta", label: "Qua" },
  { key: "quinta", label: "Qui" },
  { key: "sexta", label: "Sex" },
];

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

function getEmptyAttendance() {
  return ATTENDANCE_DAYS.reduce((acc, day) => {
    acc[day.key] = false;
    return acc;
  }, {});
}

function getPersonAttendance(person) {
  return { ...getEmptyAttendance(), ...(person.frequencia || {}) };
}

function parseCreatedAt(value) {
  const text = String(value || "");
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4}),?\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    const [, day, month, year, hour, minute, second = "0"] = match;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)).getTime();
  }

  const timestamp = Date.parse(text);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function sortByRecent(list) {
  return [...list].sort((a, b) => parseCreatedAt(b.createdAt) - parseCreatedAt(a.createdAt));
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

function participantIcon(type) {
  const marker = type === "visitor" ? "<span></span>" : "";
  return `<span class="person-icon ${type}" aria-hidden="true">${marker}</span>`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function iconSvg(name) {
  const icons = {
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="15" rx="2"></rect><path d="M8 3v4M16 3v4M4 10h16"></path><path d="M8 14h3M13 14h3M8 17h3"></path></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"></circle><path d="M4 21c1.7-4 4.3-6 8-6s6.3 2 8 6"></path></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2.1Z"></path></svg>',
    note: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="16" rx="2"></rect><path d="M9 8h6M9 12h6M9 16h3"></path></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"></path></svg>',
  };
  return icons[name] || "";
}

function renderStats() {
  const counts = getCounts();
  document.getElementById("homeStats").innerHTML = [
    statCard('<span class="group-shape start"></span>', "START", counts.START),
    statCard('<span class="group-shape up"></span>', "UP", counts.UP),
    statCard('<span class="group-shape go"></span>', "GO", counts.GO),
    statCard(totalIcon(), "Total geral", counts.total),
  ].join("");

  document.getElementById("participantStats").innerHTML = `
    <article class="stat-card participant-summary-card">
      <div class="participant-summary-item">
        <div class="stat-icon">${participantIcon("member")}</div>
        <strong>Membros</strong>
        <span class="number">${counts.Membro}</span>
      </div>
      <span class="participant-divider" aria-hidden="true"></span>
      <div class="participant-summary-item">
        <div class="stat-icon">${participantIcon("visitor")}</div>
        <strong>Visitantes</strong>
        <span class="number">${counts.Visitante}</span>
      </div>
    </article>
  `;
}

function renderList() {
  const term = searchInput.value.trim().toLowerCase();
  const filtered = sortByRecent(people.filter((person) => person.nome.toLowerCase().includes(term)));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PEOPLE_PAGE_SIZE));

  if (peoplePage >= totalPages) peoplePage = totalPages - 1;
  if (peoplePage < 0) peoplePage = 0;

  const start = peoplePage * PEOPLE_PAGE_SIZE;
  const pagePeople = filtered.slice(start, start + PEOPLE_PAGE_SIZE);

  recentCount.textContent = `${filtered.length} ${filtered.length === 1 ? "inscrito" : "inscritos"}`;
  listPager.classList.toggle("visible", filtered.length > PEOPLE_PAGE_SIZE);
  prevPeoplePage.disabled = peoplePage === 0;
  nextPeoplePage.disabled = peoplePage >= totalPages - 1;
  peoplePageStatus.textContent = `${peoplePage + 1} / ${totalPages}`;

  if (!people.length) {
    personList.innerHTML = `<article class="panel">Ainda não há inscritos carregados da planilha.</article>`;
    return;
  }

  if (!filtered.length) {
    personList.innerHTML = `<article class="panel">Nenhum inscrito encontrado.</article>`;
    return;
  }

  personList.innerHTML = pagePeople.map((person) => `
    <button class="person-card" type="button" data-person-id="${person.id}">
      <div class="avatar">&#128522;</div>
      <div>
        <div class="person-name">${escapeHtml(person.nome)}</div>
        <div class="person-age">${escapeHtml(person.idade || "-")} anos - ${escapeHtml(person.responsavel || "Responsável não informado")}</div>
        <div class="person-age">${escapeHtml(person.telefone || "")}</div>
      </div>
      <div>
        <span class="pill ${pillClass(person.classe)}">${escapeHtml(person.classe)}</span>
        <span class="tag">${escapeHtml(person.participante || "Participante")}</span>
      </div>
    </button>
  `).join("");
}

function renderChildModal(person, editing = false) {
  const attendance = getPersonAttendance(person);
  const participantClass = person.participante === "Visitante" ? "visitor" : "member";
  const groupClass = String(person.classe || "").toLowerCase();
  const ageDetail = editing
    ? `<input class="edit-field" id="editAge" type="number" min="3" max="15" value="${escapeHtml(person.idade || "")}" />`
    : `<strong>${escapeHtml(person.idade || "-")} anos</strong>`;
  const observationDetail = editing
    ? `<textarea class="edit-field" id="editObservation">${escapeHtml(person.observacao || "")}</textarea><small class="edit-hint">A idade define automaticamente o grupo ao salvar.</small>`
    : `<p>${escapeHtml(person.observacao || "Nenhuma observação registrada.")}</p>`;
  const actionButtons = editing
    ? `
      <div class="edit-actions">
        <button class="edit-registration secondary" type="button" data-action="cancel-edit">Cancelar</button>
        <button class="edit-registration" type="button" data-action="save-edit">Salvar</button>
      </div>
    `
    : `<button class="edit-registration" type="button" data-action="edit-registration"><span aria-hidden="true">${iconSvg("edit")}</span>Editar Inscrição</button>`;
  const checks = ATTENDANCE_DAYS.map((day) => `
    <label class="day-check">
      <span>${day.label}</span>
      <input type="checkbox" name="${day.key}" ${attendance[day.key] ? "checked" : ""} />
    </label>
  `).join("");

  modalChildName.textContent = "Detalhes da Inscrição";
  modalBody.innerHTML = `
    <div class="child-summary">
      <div class="child-avatar" aria-hidden="true">&#128522;</div>
      <div>
        <div class="child-name">${escapeHtml(person.nome || "Criança")}</div>
        <div class="child-tags">
          <span class="child-chip group ${groupClass}">${escapeHtml(person.classe || "-")}</span>
          <span class="child-chip ${participantClass}">${escapeHtml(person.participante || "Participante")}</span>
        </div>
      </div>
    </div>
    <div class="detail-grid">
      <div class="detail-item"><span class="detail-icon">${iconSvg("calendar")}</span><span>Idade</span>${ageDetail}</div>
      <div class="detail-item"><span class="detail-icon">${iconSvg("user")}</span><span>Responsável</span><strong>${escapeHtml(person.responsavel || "Não informado")}</strong></div>
      <div class="detail-item"><span class="detail-icon">${iconSvg("phone")}</span><span>Telefone</span><strong>${escapeHtml(person.telefone || "Não informado")}</strong></div>
      <div class="detail-item"><span class="detail-icon">${iconSvg("note")}</span><span>Observações</span>${observationDetail}</div>
    </div>
    <div class="attendance">
      <h4>Frequência</h4>
      <div class="attendance-grid">${checks}</div>
    </div>
    ${actionButtons}
  `;
}

function openChildModal(personId) {
  const person = people.find((item) => item.id === personId);
  if (!person) return;

  selectedPersonId = personId;
  renderChildModal(person);
  childModal.classList.add("visible");
  childModal.setAttribute("aria-hidden", "false");
}

function closeChildModal() {
  selectedPersonId = "";
  childModal.classList.remove("visible");
  childModal.setAttribute("aria-hidden", "true");
}

async function saveAttendance(person) {
  const res = await fetch("/api/frequencia", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: person.id,
      classe: person.classe,
      frequencia: getPersonAttendance(person),
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erro ao salvar frequência.");
}

async function updateAttendance(day, checked) {
  const person = people.find((item) => item.id === selectedPersonId);
  if (!person) return;

  person.frequencia = getPersonAttendance(person);
  person.frequencia[day] = checked;

  try {
    await saveAttendance(person);
    showToast("Frequência atualizada.");
  } catch (err) {
    showToast(err.message || "Não foi possível salvar a frequência.", "error");
  }
}

async function saveRegistrationEdit() {
  const person = people.find((item) => item.id === selectedPersonId);
  if (!person) return;

  const idade = document.getElementById("editAge").value.trim();
  const observacao = document.getElementById("editObservation").value.trim();
  const novaClasse = getClassByAge(idade);

  if (!novaClasse) {
    showToast("A idade deve estar entre 3 e 15 anos.", "error");
    return;
  }

  try {
    const res = await fetch("/api/inscricao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: person.id,
        classe: person.classe,
        idade,
        observacao,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao atualizar inscrição.");

    showToast(data.moved ? `Inscrição movida para ${novaClasse}.` : "Inscrição atualizada.");
    closeChildModal();
    await loadPeople({ silent: true });
  } catch (err) {
    showToast(err.message || "Não foi possível atualizar a inscrição.", "error");
  }
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
    observacao: form.observacao.value.trim(),
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

searchInput.addEventListener("input", () => {
  peoplePage = 0;
  renderList();
});
refreshBtn.addEventListener("click", () => loadPeople());
idadeInput.addEventListener("input", updateClassPreview);
prevPeoplePage.addEventListener("click", () => {
  peoplePage -= 1;
  renderList();
});
nextPeoplePage.addEventListener("click", () => {
  peoplePage += 1;
  renderList();
});
personList.addEventListener("click", (event) => {
  const card = event.target.closest(".person-card");
  if (card) openChildModal(card.dataset.personId);
});
modalClose.addEventListener("click", closeChildModal);
childModal.addEventListener("click", (event) => {
  if (event.target === childModal) closeChildModal();
});
modalBody.addEventListener("change", (event) => {
  if (event.target.matches(".attendance-grid input")) {
    updateAttendance(event.target.name, event.target.checked);
  }
});
modalBody.addEventListener("click", (event) => {
  const action = event.target.closest("[data-action]")?.dataset.action;
  const person = people.find((item) => item.id === selectedPersonId);
  if (!action || !person) return;

  if (action === "edit-registration") renderChildModal(person, true);
  if (action === "cancel-edit") renderChildModal(person);
  if (action === "save-edit") saveRegistrationEdit();
});
window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);

updateOnlineStatus();
updateClassPreview();
renderAll();
loadPeople({ silent: true });
