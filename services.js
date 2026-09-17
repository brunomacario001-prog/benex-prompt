const ADMIN_SERVICES_URL = "https://admin-api.benex.net.br/services";

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

async function atualizarServicosBeneX() {
  const renderRow = localizarLinhaServico("Render");
  const githubRow = localizarLinhaServico("GitHub");
  if (!renderRow && !githubRow) return;

  [renderRow, githubRow].filter(Boolean).forEach(row => {
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
    const render = data?.services?.render;
    const github = data?.services?.github;

    atualizarLinha("Render", render, "serviços", render?.services, "Render API");
    atualizarLinha("GitHub", github, "repositórios", github?.repositories, "GitHub API");
  } catch (error) {
    [renderRow, githubRow].filter(Boolean).forEach(row => {
      const status = row.querySelector("span:last-child");
      status.textContent = "Indisponível";
      status.className = "status-error";
      row.title = "Não foi possível consultar a BeneX Admin API";
    });
  }
}

window.atualizarServicosBeneX = atualizarServicosBeneX;
document.addEventListener("DOMContentLoaded", atualizarServicosBeneX);
