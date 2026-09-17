const ADMIN_SERVICES_URL = "https://admin-api.benex.net.br/services";

function renderStatusText(render) {
  if (!render) return "Sem dados";
  if (render.status === "online") return `Online • ${render.count ?? 0} serviços`;
  if (render.status === "pending") return "Configuração pendente";
  return "Falha na integração";
}

async function atualizarServicosBeneX() {
  const renderStatus = document.getElementById("render-service-status");
  const renderDetails = document.getElementById("render-service-details");
  if (!renderStatus) return;

  renderStatus.textContent = "Verificando...";
  renderStatus.className = "status-warn";

  try {
    const response = await fetch(ADMIN_SERVICES_URL, {
      cache: "no-store",
      credentials: "include",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const render = data?.services?.render;
    const online = render?.status === "online";

    renderStatus.textContent = renderStatusText(render);
    renderStatus.className = online ? "status-ok" : "status-warn";

    if (renderDetails) {
      const nomes = Array.isArray(render?.services)
        ? render.services.map(service => service.name).filter(Boolean)
        : [];
      renderDetails.textContent = nomes.length
        ? nomes.join(" • ")
        : "Render API";
    }
  } catch (error) {
    renderStatus.textContent = "Indisponível";
    renderStatus.className = "status-error";
    if (renderDetails) renderDetails.textContent = "Não foi possível consultar a Admin API";
  }
}

window.atualizarServicosBeneX = atualizarServicosBeneX;
document.addEventListener("DOMContentLoaded", atualizarServicosBeneX);
