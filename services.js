const ADMIN_SERVICES_URL = "https://admin-api.benex.net.br/services";

function localizarLinhaRender() {
  return [...document.querySelectorAll("#servicos .service-row")]
    .find(row => row.querySelector("span")?.textContent.trim() === "Render");
}

function renderStatusText(render) {
  if (!render) return "Sem dados";
  if (render.status === "online") return `Online • ${render.count ?? 0} serviços`;
  if (render.status === "pending") return "Configuração pendente";
  return "Falha na integração";
}

async function atualizarServicosBeneX() {
  const row = localizarLinhaRender();
  if (!row) return;

  const renderStatus = row.querySelector("span:last-child");
  renderStatus.textContent = "Verificando...";
  renderStatus.className = "status-warn";
  row.title = "Consultando BeneX Admin API";

  try {
    const response = await fetch(ADMIN_SERVICES_URL, {
      cache: "no-store",
      credentials: "include",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const render = data?.services?.render;
    const online = render?.status === "online";
    const nomes = Array.isArray(render?.services)
      ? render.services.map(service => service.name).filter(Boolean)
      : [];

    renderStatus.textContent = renderStatusText(render);
    renderStatus.className = online ? "status-ok" : "status-warn";
    row.title = nomes.length ? nomes.join(" • ") : "Render API";
  } catch (error) {
    renderStatus.textContent = "Indisponível";
    renderStatus.className = "status-error";
    row.title = "Não foi possível consultar a BeneX Admin API";
  }
}

window.atualizarServicosBeneX = atualizarServicosBeneX;
document.addEventListener("DOMContentLoaded", atualizarServicosBeneX);
