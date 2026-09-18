const ADMIN_SERVICES_URL = "https://admin-api.benex.net.br/services";
const SYSTEM_URL = "https://api.benex.net.br/system";

let ultimoServicos = null;
let ultimoSistema = null;

function localizarLinhaServico(nome) {
  return [...document.querySelectorAll("#servicos .service-row")]
    .find(row => row.querySelector("span")?.textContent.trim() === nome);
}

function statusText(item, unidade) {
  if (!item) return "Sem dados";
  if (item.status === "online") return `Online • ${item.count ?? 0} ${unidade}`;
  if (item.status === "pending") return "Configuração pendente";
  return "Falha na integração";
}

function atualizarLinha(nome, item, unidade, colecao, fallback) {
  const row = localizarLinhaServico(nome);
  if (!row) return;

  const status = row.querySelector("span:last-child");
  const online = item?.status === "online";
  status.textContent = statusText(item, unidade);
  status.className = online ? "status-ok" : item?.status === "error" ? "status-error" : "status-warn";

  const nomes = Array.isArray(colecao)
    ? colecao.map(entry => entry.name).filter(Boolean)
    : [];
  row.title = nomes.length ? nomes.join(" • ") : fallback;
}

function atualizarResumoGeral() {
  const resumo = document.getElementById("resumo-status");
  if (!resumo || !ultimoServicos) return;

  const services = ultimoServicos.services || {};
  const partes = [];

  if (services.vercel?.status === "online") {
    partes.push(`Vercel: ${services.vercel.count ?? 0} projetos`);
  }
  if (services.render?.status === "online") {
    partes.push(`Render: ${services.render.count ?? 0} serviços`);
  }
  if (services.github?.status === "online") {
    partes.push(`GitHub: ${services.github.count ?? 0} repositórios`);
  }

  if (ultimoSistema) {
    const memoria = ultimoSistema.memory?.used_percent;
    const disco = ultimoSistema.disk?.used_percent;
    if (memoria !== undefined) partes.push(`Memória: ${memoria}%`);
    if (disco !== undefined) partes.push(`Armazenamento: ${disco}%`);
  }

  resumo.textContent = partes.length
    ? `Infraestrutura BeneX operacional • ${partes.join(" • ")}`
    : "Infraestrutura BeneX disponível.";
}

async function atualizarServicosBeneX() {
  const renderRow = localizarLinhaServico("Render");
  const githubRow = localizarLinhaServico("GitHub");
  const vercelRow = localizarLinhaServico("Vercel");
  const rows = [renderRow, githubRow, vercelRow].filter(Boolean);

  rows.forEach(row => {
    const status = row.querySelector("span:last-child");
    status.textContent = "Verificando...";
    status.className = "status-warn";
  });

  try {
    const response = await fetch(ADMIN_SERVICES_URL, {
      cache: "no-store",
      credentials: "include",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    ultimoServicos = data;

    const render = data?.services?.render;
    const github = data?.services?.github;
    const vercel = data?.services?.vercel;

    atualizarLinha("Render", render, "serviços", render?.services, "Render API");
    atualizarLinha("GitHub", github, "repositórios", github?.repositories, "GitHub API");
    atualizarLinha("Vercel", vercel, "projetos", vercel?.projects, "Vercel API");
    atualizarResumoGeral();
  } catch (error) {
    rows.forEach(row => {
      const status = row.querySelector("span:last-child");
      status.textContent = "Indisponível";
      status.className = "status-error";
      row.title = "Não foi possível consultar a BeneX Admin API";
    });
  }
}

function localizarCardSistema(titulo) {
  return [...document.querySelectorAll("#sistema .card")]
    .find(card => card.querySelector("h3")?.textContent.trim() === titulo);
}

function preencherCardSistema(titulo, texto, detalhe) {
  const card = localizarCardSistema(titulo);
  if (!card) return;
  const p = card.querySelector(".muted");
  if (!p) return;
  p.textContent = texto;
  card.title = detalhe || "";
}

async function atualizarSistemaBeneX() {
  try {
    const response = await fetch(SYSTEM_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    ultimoSistema = data;

    preencherCardSistema(
      "CPU",
      `${data.cpu_logical ?? "—"} CPUs lógicas`,
      `${data.system ?? ""} ${data.release ?? ""} • ${data.architecture ?? ""}`.trim()
    );
    preencherCardSistema(
      "Memória",
      `${data.memory?.used_percent ?? "—"}% em uso`,
      data.memory ? `${data.memory.available_gb ?? "—"} GB disponíveis de ${data.memory.total_gb ?? "—"} GB` : ""
    );
    preencherCardSistema(
      "Armazenamento",
      `${data.disk?.used_percent ?? "—"}% em uso`,
      data.disk ? `${data.disk.free_gb ?? "—"} GB livres de ${data.disk.total_gb ?? "—"} GB` : ""
    );
    atualizarResumoGeral();
  } catch (error) {
    preencherCardSistema("CPU", "Indisponível", "Não foi possível consultar /system");
    preencherCardSistema("Memória", "Indisponível", "Não foi possível consultar /system");
    preencherCardSistema("Armazenamento", "Indisponível", "Não foi possível consultar /system");
  }
}

window.atualizarServicosBeneX = atualizarServicosBeneX;
window.atualizarSistemaBeneX = atualizarSistemaBeneX;

document.addEventListener("DOMContentLoaded", () => {
  atualizarServicosBeneX();
  atualizarSistemaBeneX();
  setInterval(atualizarServicosBeneX, 30000);
  setInterval(atualizarSistemaBeneX, 30000);
});
