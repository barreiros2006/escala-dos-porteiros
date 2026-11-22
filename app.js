(function () {
  "use strict";

  /* ===== Configuração ===== */
  const POSTOS = ["Porta Frente", "Átrio", "Porta Meio", "Banheiro"];
  const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const SENHA_ADM = "2580";
  const CHAVE_LOCAL = "ccb-escala-porteiros-v6";
  const CHAVES_ANTIGAS = ["ccb-porteiros-v3", "ccb-escala-porteiros-v2", "ccb-escala-porteiros-v1"];
  // Domingo de referência do rodízio: neste dia cada grupo usa a ordem cadastrada.
  // O rodízio continua sem interrupção de um ano para o outro.
  const DOMINGO_REFERENCIA = new Date(2027, 0, 3, 12);
  const UM_DIA = 24 * 60 * 60 * 1000;

  const PADRAO = {
    app: "Escala de Porteiros CCB",
    versao: 7,
    atualizadoEm: null,
    grupos: [
      { id: 1, nome: "Grupo 1", porteiros: ["Rodrigo", "Cazé", "Willian", "Claudeci"] },
      { id: 2, nome: "Grupo 2", porteiros: ["", "", "", ""] },
      { id: 3, nome: "Grupo 3", porteiros: ["", "", "", ""] },
    ],
  };

  /* ===== Elementos ===== */
  const $ = (id) => document.getElementById(id);
  const ui = {
    ano: $("filtroAno"),
    mes: $("filtroMes"),
    grupo: $("filtroGrupo"),
    nome: $("filtroNome"),
    data: $("filtroData"),
    btnLimpar: $("btnLimpar"),
    btnExcel: $("btnExcel"),
    btnJson: $("btnJson"),
    lblImportar: $("lblImportar"),
    inputImportar: $("inputImportar"),
    btnAdm: $("btnAdm"),
    btnSair: $("btnSair"),
    btnInstalar: $("btnInstalar"),
    painelAdm: $("painelAdm"),
    gruposAdm: $("gruposAdm"),
    btnSalvar: $("btnSalvar"),
    btnDescartar: $("btnDescartar"),
    titulo: $("tituloEscala"),
    contador: $("contador"),
    origem: $("origemDados"),
    lista: $("listaEscala"),
    vazio: $("vazio"),
    modal: $("modalLogin"),
    form: $("formLogin"),
    senha: $("inputSenha"),
    erro: $("erroLogin"),
    btnCancelarLogin: $("btnCancelarLogin"),
    toast: $("toast"),
  };

  let dados = clonar(PADRAO);
  let origem = "padrao";
  let modoAdm = false;
  let promptInstalacao = null;

  /* ===== Utilitários ===== */
  function clonar(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function escHtml(v) {
    return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function semAcento(v) {
    return String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }

  function limparNome(v) {
    const t = typeof v === "string" ? v.trim() : "";
    if (!t || t === "Não definido") return "";
    return t.slice(0, 60);
  }

  function chaveData(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function dataBR(d) {
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  }

  // Sempre posiciona o app no ano e mês atuais.
  function irParaMesAtual() {
    const hoje = new Date();
    ui.ano.value = hoje.getFullYear();
    ui.mes.value = String(hoje.getMonth());
  }

  function anoSelecionado() {
    const n = parseInt(ui.ano.value, 10);
    return n >= 2020 && n <= 2100 ? n : new Date().getFullYear();
  }

  function aviso(msg, tempo = 3500) {
    ui.toast.textContent = msg;
    ui.toast.classList.remove("oculto");
    clearTimeout(aviso.t);
    aviso.t = setTimeout(() => ui.toast.classList.add("oculto"), tempo);
  }

  function baixar(conteudo, tipo, nomeArquivo) {
    const blob = new Blob([conteudo], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ===== Dados ===== */
  // Aceita o formato atual e os formatos das versões anteriores.
  function normalizar(obj) {
    try {
      if (!obj || typeof obj !== "object") return null;
      const lista = obj.grupos || obj.groups;
      if (!Array.isArray(lista) || lista.length !== 3) return null;
      const grupos = lista.map((g, i) => {
        const p = (g && (g.porteiros || g.p || g.members)) || [];
        if (!Array.isArray(p)) throw new Error("formato");
        return { id: i + 1, nome: `Grupo ${i + 1}`, porteiros: [0, 1, 2, 3].map((k) => limparNome(p[k])) };
      });
      return {
        app: PADRAO.app,
        versao: PADRAO.versao,
        atualizadoEm: obj.atualizadoEm || obj.exportadoEm || obj.exportedAt || null,
        grupos,
      };
    } catch {
      return null;
    }
  }

  function lerLocal() {
    for (const chave of [CHAVE_LOCAL, ...CHAVES_ANTIGAS]) {
      try {
        const v = normalizar(JSON.parse(localStorage.getItem(chave)));
        if (v) return v;
      } catch { /* ignora */ }
    }
    return null;
  }

  async function lerArquivoSite() {
    try {
      const r = await fetch(`escala.json?t=${Date.now()}`, { cache: "no-store" });
      if (!r.ok) return null;
      return normalizar(await r.json());
    } catch {
      return null;
    }
  }

  const tempo = (d) => Date.parse(d && d.atualizadoEm) || 0;

  function salvarLocal() {
    try {
      localStorage.setItem(CHAVE_LOCAL, JSON.stringify(dados));
    } catch {
      aviso("Não foi possível salvar neste navegador.");
    }
  }

  function atualizarOrigem() {
    const textos = {
      arquivo: "Dados: escala.json do site",
      local: "Dados: alterações salvas neste navegador",
      padrao: "Dados: cadastro inicial do app",
    };
    ui.origem.textContent = textos[origem] || "";
  }

  /* ===== Escala ===== */
  function domingosDoAno(ano) {
    const lista = [];
    const d = new Date(ano, 0, 1, 12);
    while (d.getDay() !== 0) d.setDate(d.getDate() + 1);
    while (d.getFullYear() === ano) {
      lista.push(new Date(d));
      d.setDate(d.getDate() + 7);
    }
    return lista;
  }

  function deslocamento(data) {
    const semanas = Math.round((data - DOMINGO_REFERENCIA) / (7 * UM_DIA));
    return ((semanas % 4) + 4) % 4;
  }

  // A cada domingo, cada porteiro muda de posição.
  function montarEscala(ano) {
    const linhas = [];
    domingosDoAno(ano).forEach((data) => {
      const s = deslocamento(data);
      dados.grupos.forEach((g) => {
        const postos = POSTOS.map((posto, i) => ({ posto, nome: g.porteiros[(i + s) % 4] || "" }));
        linhas.push({ data, grupo: g, postos });
      });
    });
    return linhas;
  }

  function escalaFiltrada() {
    const mes = ui.mes.value;
    const grupo = ui.grupo.value;
    const nome = semAcento(ui.nome.value);
    const data = ui.data.value;
    return montarEscala(anoSelecionado()).filter((l) =>
      (mes === "" || String(l.data.getMonth()) === mes) &&
      (!grupo || String(l.grupo.id) === grupo) &&
      (!nome || l.postos.some((p) => semAcento(p.nome).includes(nome))) &&
      (!data || chaveData(l.data) === data)
    );
  }

  function render() {
    const ano = anoSelecionado();
    const lista = escalaFiltrada();
    const nome = semAcento(ui.nome.value);

    ui.titulo.textContent = ui.mes.value === ""
      ? `Escala de ${ano}`
      : `Escala de ${MESES[Number(ui.mes.value)]} de ${ano}`;
    ui.contador.textContent = `${lista.length} ${lista.length === 1 ? "escala encontrada" : "escalas encontradas"}`;
    atualizarOrigem();

    ui.lista.innerHTML = lista.map((l) => `
      <article class="card">
        <div class="card-topo"><h3>${escHtml(l.grupo.nome)}</h3><span>${dataBR(l.data)}</span></div>
        <div class="postos">
          ${l.postos.map((p) => {
            const classes = ["posto"];
            if (!p.nome) classes.push("vago");
            if (nome && p.nome && semAcento(p.nome).includes(nome)) classes.push("destaque");
            return `<div class="${classes.join(" ")}"><small>${escHtml(p.posto)}</small><strong>${p.nome ? escHtml(p.nome) : "Não definido"}</strong></div>`;
          }).join("")}
        </div>
      </article>`).join("");

    if (lista.length) {
      ui.vazio.classList.add("oculto");
    } else {
      let msg = "Nenhuma escala encontrada com os filtros informados.";
      if (ui.data.value) {
        const d = new Date(`${ui.data.value}T12:00:00`);
        if (d.getDay() !== 0) msg = "A data selecionada não é um domingo. Escolha um domingo.";
      }
      ui.vazio.textContent = msg;
      ui.vazio.classList.remove("oculto");
    }
  }

  /* ===== ADM ===== */
  function renderAdm() {
    ui.gruposAdm.innerHTML = dados.grupos.map((g, gi) => `
      <div class="grupo-adm">
        <h3>${escHtml(g.nome)}</h3>
        <small>Ordem inicial (domingo ${dataBR(DOMINGO_REFERENCIA)})</small>
        ${g.porteiros.map((nome, pi) => `
          <div class="linha-porteiro">
            <label>${POSTOS[pi]}
              <input type="text" maxlength="60" data-g="${gi}" data-p="${pi}" value="${escHtml(nome)}" placeholder="Adicionar porteiro">
            </label>
            <button type="button" class="btn perigo" data-excluir="${gi}-${pi}" title="Excluir porteiro">Excluir</button>
          </div>`).join("")}
      </div>`).join("");
  }

  function entrarAdm() {
    modoAdm = true;
    sessionStorage.setItem("ccb-adm", "1");
    ui.painelAdm.classList.remove("oculto");
    ui.lblImportar.classList.remove("oculto");
    ui.btnSair.classList.remove("oculto");
    ui.btnAdm.textContent = "ADM ativo";
    renderAdm();
  }

  function sairAdm() {
    modoAdm = false;
    sessionStorage.removeItem("ccb-adm");
    ui.painelAdm.classList.add("oculto");
    ui.lblImportar.classList.add("oculto");
    ui.btnSair.classList.add("oculto");
    ui.btnAdm.textContent = "Modo ADM";
  }

  function abrirLogin() {
    if (modoAdm) {
      ui.painelAdm.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    ui.erro.textContent = "";
    ui.senha.value = "";
    ui.modal.classList.remove("oculto");
    setTimeout(() => ui.senha.focus(), 50);
  }

  function fecharLogin() {
    ui.modal.classList.add("oculto");
    ui.erro.textContent = "";
    ui.senha.value = "";
  }

  function salvarAdm() {
    const novos = clonar(dados.grupos);
    ui.gruposAdm.querySelectorAll("input[data-g]").forEach((inp) => {
      novos[Number(inp.dataset.g)].porteiros[Number(inp.dataset.p)] = limparNome(inp.value);
    });

    for (const g of novos) {
      const nomes = g.porteiros.filter(Boolean).map(semAcento);
      if (new Set(nomes).size !== nomes.length) {
        aviso(`${g.nome}: há nomes repetidos no mesmo grupo.`);
        return;
      }
    }

    dados.grupos = novos;
    dados.atualizadoEm = new Date().toISOString();
    salvarLocal();
    origem = "local";
    renderAdm();
    render();
    aviso("Alterações salvas. Exporte o JSON e envie o escala.json ao GitHub para valer para todos.", 6000);
  }

  /* ===== Exportação e importação ===== */
  function exportarJson() {
    const payload = { ...dados, atualizadoEm: dados.atualizadoEm || new Date().toISOString() };
    baixar(JSON.stringify(payload, null, 2), "application/json", "escala.json");
    aviso("Arquivo escala.json gerado. Substitua o escala.json da pasta do app no GitHub.", 6000);
  }

  function exportarExcel() {
    const lista = escalaFiltrada();
    if (!lista.length) {
      aviso("Não há escala para exportar com os filtros atuais.");
      return;
    }
    const linhas = [["Data", "Grupo", ...POSTOS]];
    lista.forEach((l) => linhas.push([dataBR(l.data), l.grupo.nome, ...l.postos.map((p) => p.nome || "Não definido")]));
    const ano = anoSelecionado();
    const sufixo = ui.mes.value === "" ? `${ano}` : `${String(Number(ui.mes.value) + 1).padStart(2, "0")}-${ano}`;
    const bytes = window.EscalaXlsx.criar(`Escala ${sufixo}`, linhas, [12, 10, 20, 20, 20, 20]);
    baixar(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", `escala-porteiros-${sufixo}.xlsx`);
  }

  function importarJson(ev) {
    const arquivo = ev.target.files && ev.target.files[0];
    ev.target.value = "";
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = () => {
      let novo = null;
      try { novo = normalizar(JSON.parse(String(leitor.result))); } catch { novo = null; }
      if (!novo) {
        aviso("JSON inválido ou incompatível com o app.");
        return;
      }
      dados = novo;
      dados.atualizadoEm = new Date().toISOString();
      salvarLocal();
      origem = "local";
      renderAdm();
      render();
      aviso("JSON importado com sucesso.");
    };
    leitor.readAsText(arquivo);
  }

  /* ===== Eventos ===== */
  function ligarEventos() {
    ui.ano.addEventListener("input", render);
    ui.mes.addEventListener("change", render);
    ui.grupo.addEventListener("change", render);
    ui.nome.addEventListener("input", render);
    ui.data.addEventListener("change", () => {
      if (ui.data.value) {
        // Ajusta ano e mês para a data escolhida.
        ui.ano.value = Number(ui.data.value.slice(0, 4));
        ui.mes.value = String(Number(ui.data.value.slice(5, 7)) - 1);
      }
      render();
    });

    ui.btnLimpar.addEventListener("click", () => {
      ui.grupo.value = "";
      ui.nome.value = "";
      ui.data.value = "";
      irParaMesAtual();
      render();
    });

    ui.btnExcel.addEventListener("click", exportarExcel);
    ui.btnJson.addEventListener("click", exportarJson);
    ui.inputImportar.addEventListener("change", importarJson);

    ui.btnAdm.addEventListener("click", abrirLogin);
    ui.btnSair.addEventListener("click", sairAdm);
    ui.btnCancelarLogin.addEventListener("click", fecharLogin);
    ui.modal.addEventListener("click", (e) => { if (e.target === ui.modal) fecharLogin(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") fecharLogin(); });

    ui.form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (ui.senha.value.trim() === SENHA_ADM) {
        fecharLogin();
        entrarAdm();
        aviso("Modo ADM ativado.");
      } else {
        ui.erro.textContent = "Senha incorreta.";
        ui.senha.select();
      }
    });

    ui.gruposAdm.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-excluir]");
      if (!btn) return;
      const [g, p] = btn.dataset.excluir.split("-");
      const inp = ui.gruposAdm.querySelector(`input[data-g="${g}"][data-p="${p}"]`);
      if (inp && inp.value.trim() && confirm(`Excluir "${inp.value.trim()}"? Clique em Salvar alterações para confirmar.`)) {
        inp.value = "";
        inp.focus();
      }
    });

    ui.btnSalvar.addEventListener("click", salvarAdm);
    ui.btnDescartar.addEventListener("click", () => { renderAdm(); aviso("Alterações descartadas."); });

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      promptInstalacao = e;
      ui.btnInstalar.classList.remove("oculto");
    });
    ui.btnInstalar.addEventListener("click", async () => {
      if (!promptInstalacao) return;
      promptInstalacao.prompt();
      await promptInstalacao.userChoice;
      promptInstalacao = null;
      ui.btnInstalar.classList.add("oculto");
    });
  }

  /* ===== Service Worker ===== */
  function registrarServiceWorker() {
    if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
    const tinhaControlador = !!navigator.serviceWorker.controller;
    let recarregou = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (tinhaControlador && !recarregou) {
        recarregou = true;
        location.reload();
      }
    });
    navigator.serviceWorker.register("service-worker.js", { updateViaCache: "none" })
      .then((reg) => reg.update())
      .catch(() => { /* o app funciona mesmo sem service worker */ });
  }

  /* ===== Início ===== */
  async function iniciar() {
    ligarEventos();
    irParaMesAtual();
    render(); // mostra o mês atual imediatamente

    const local = lerLocal();
    const arquivo = await lerArquivoSite();

    if (local && arquivo) {
      if (tempo(local) > tempo(arquivo)) { dados = local; origem = "local"; }
      else { dados = arquivo; origem = "arquivo"; }
    } else if (arquivo) {
      dados = arquivo; origem = "arquivo";
    } else if (local) {
      dados = local; origem = "local";
    } else {
      dados = clonar(PADRAO); origem = "padrao";
    }

    render();
    if (sessionStorage.getItem("ccb-adm") === "1") entrarAdm();
    registrarServiceWorker();
  }

  iniciar();
})();
