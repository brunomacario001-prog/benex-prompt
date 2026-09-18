const ADMIN_SERVICES_URL = "https://admin-api.benex.net.br/services";
const SYSTEM_URL = "https://api.benex.net.br/system";

let ultimoServicos = null;
let ultimoSistema = null;

function aplicarAcabamentoVisual() {
  if (document.getElementById("benex-polish")) return;

  const style = document.createElement("style");
  style.id = "benex-polish";
  style.textContent = `
    #sistema .section-title,
    #servicos .section-title { display: none; }

    .card,
    .terminal-box {
      transition: border-color .18s ease, transform .18s ease, box-shadow .18s ease;
    }

    .card:hover {
      border-color: #3d444d;
      box-shadow: 0 8px 24px rgba(0,0,0,.14);
    }

    #sistema .card {
      min-height: 118px;
    }

    .metric-value {
      margin: 4px 0 10px;
      color: #f0f6fc;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -.02em;
    }

    .metric-sub {
      color: #8b949e;
      font-size: 12px;
      margin-top: 8px;
    }

    .metric-bar {
      height: 7px;
      overflow: hidden;
      background: #21262d;
      border-radius: 999px;
      margin-top: 12px;
    }

    .metric-bar > span {
      display: block;
      height: 100%;
      background: #3fb950;
      border-radius: inherit;
      transition: width .3s ease;
    }

    .metric-bar.warn > span { background: #d29922; }
    .metric-bar.danger > span { background: #f85149; }

    #servicos .service-row {
      align-items: center;
      gap: 18px;
      min-height: 44px;
    }

    #servicos .service-row > span:first-child {
      color: #f0f6fc;
      font-weight: 600;
    }

    #servicos .service-row > span:last-child {
      white-space: nowrap;
      font-size: 13px;
    }

    #resumo-status {
      line-height: 1.6;
      margin-bottom: 0;
    }

    @media(max-width:800px) {
      #servicos .service-row {
        align-items: flex-start;
        flex-direction: column;
        gap: 6px;
      }

      #servicos .service-row > span:last-child {
        white-space: normal;
      }
    }
  `;
  document.head.appendChild(style);
}

function atualizarBarraMetrica(card, percentual) {
  if (!card || percentual === undefined || percentual === null) return;

  let bar = card.querySelector(".metric-bar");
  if (!bar) {
    bar = document.createElement("div");
    bar.className = "metric-bar";
    bar.innerHTML = "<span></span>";
    card.appendChild(bar);
  }

  const valor = Math.max(0, Math.min(100, Number(percentual) || 0));
  bar.className = "metric-bar" + (valor >= 90 ? " danger" : valor >= 75 ? " warn" : "");
  bar.querySelector("span").style.width = `${valor}%`;
}

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

function preencherCardSistema(titulo, texto, detalhe, percentual = null) {
  const card = localizarCardSistema(titulo);
  if (!card) return;

  let p = card.querySelector(".muted");
  if (!p) return;

  p.classList.remove("muted");
  p.classList.add("metric-value");
  p.textContent = texto;
  card.title = detalhe || "";

  let sub = card.querySelector(".metric-sub");
  if (!sub) {
    sub = document.createElement("div");
    sub.className = "metric-sub";
    p.insertAdjacentElement("afterend", sub);
  }
  sub.textContent = detalhe || "";

  if (percentual !== null) atualizarBarraMetrica(card, percentual);
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
      data.memory ? `${data.memory.available_gb ?? "—"} GB disponíveis de ${data.memory.total_gb ?? "—"} GB` : "",
      data.memory?.used_percent
    );
    preencherCardSistema(
      "Armazenamento",
      `${data.disk?.used_percent ?? "—"}% em uso`,
      data.disk ? `${data.disk.free_gb ?? "—"} GB livres de ${data.disk.total_gb ?? "—"} GB` : "",
      data.disk?.used_percent
    );
    atualizarResumoGeral();
  } catch (error) {
    preencherCardSistema("CPU", "Indisponível", "Não foi possível consultar /system");
    preencherCardSistema("Memória", "Indisponível", "Não foi possível consultar /system");
    preencherCardSistema("Armazenamento", "Indisponível", "Não foi possível consultar /system");
  }
}


function habilitarColarNoTerminal() {
  const terminalAtivo = () => {
    const paginaTerminal = document.getElementById("terminal");
    const container = document.getElementById("xterm-container");
    return paginaTerminal?.classList.contains("active")
      && container
      && container.style.display !== "none";
  };

  const enviarTextoColado = texto => {
    if (!texto) return false;

    if (typeof term !== "undefined" && term && typeof term.paste === "function") {
      term.paste(texto);
      term.focus();
      return true;
    }

    if (typeof ws !== "undefined" && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "input", data: texto }));
      return true;
    }

    return false;
  };

  document.addEventListener("paste", event => {
    if (!terminalAtivo()) return;

    const texto = event.clipboardData?.getData("text");
    if (!texto) return;

    event.preventDefault();
    enviarTextoColado(texto);
  }, true);

  document.addEventListener("keydown", async event => {
    const teclaV = event.key?.toLowerCase() === "v";
    const atalhoColar = teclaV && (event.ctrlKey || event.metaKey);
    if (!atalhoColar || !terminalAtivo()) return;

    if (!navigator.clipboard?.readText) return;

    event.preventDefault();

    try {
      const texto = await navigator.clipboard.readText();
      enviarTextoColado(texto);
    } catch (erro) {
      console.warn("BeneX Terminal: acesso à área de transferência não permitido.", erro);
    }
  }, true);
}

window.atualizarServicosBeneX = atualizarServicosBeneX;
window.atualizarSistemaBeneX = atualizarSistemaBeneX;

document.addEventListener("DOMContentLoaded", () => {
  aplicarAcabamentoVisual();
  habilitarColarNoTerminal();
  atualizarServicosBeneX();
  atualizarSistemaBeneX();
  setInterval(atualizarServicosBeneX, 30000);
  setInterval(atualizarSistemaBeneX, 30000);
});
