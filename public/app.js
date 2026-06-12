// ── PWA Registration ────────────────────────────────────────────
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

// ── Offline banner ───────────────────────────────────────────────
const offlineBanner = document.getElementById("offlineBanner");

function updateOnlineStatus() {
  offlineBanner.classList.toggle("visible", !navigator.onLine);
}

window.addEventListener("online",  updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);
updateOnlineStatus();

// ── Toast helper ─────────────────────────────────────────────────
const toastEl = document.getElementById("toast");
let toastTimer;

function showToast(msg, type = "success") {
  clearTimeout(toastTimer);
  toastEl.textContent = msg;
  toastEl.className = `toast ${type} show`;
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3500);
}

// ── Form submit ──────────────────────────────────────────────────
const form      = document.getElementById("cadastroForm");
const submitBtn = document.getElementById("submitBtn");
const spinner   = document.getElementById("spinner");
const btnText   = document.getElementById("btnText");

function setLoading(loading) {
  submitBtn.disabled = loading;
  spinner.style.display = loading ? "block" : "none";
  btnText.textContent   = loading ? "Enviando…" : "Cadastrar";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nome      = form.nome.value.trim();
  const email     = form.email.value.trim();
  const telefone  = form.telefone.value.trim();
  const observacao = form.observacao.value.trim();

  // Validação client-side
  if (!nome) { showToast("Nome é obrigatório.", "error"); form.nome.focus(); return; }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast("Informe um e-mail válido.", "error"); form.email.focus(); return;
  }

  setLoading(true);

  try {
    const res = await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, email, telefone, observacao }),
    });

    const data = await res.json();

    if (res.ok) {
      showToast("✅ Cadastro realizado com sucesso!");
      form.reset();
    } else {
      showToast(data.error || "Erro ao cadastrar.", "error");
    }
  } catch {
    showToast("Sem conexão. Tente novamente.", "error");
  } finally {
    setLoading(false);
  }
});
