// ===== MAPA BASE =====
var map = L.map('map').setView([-14.266, -42.259], 12);

L.marker([-14.27, -42.26]).addTo(map)
  .bindPopup("📍 Ponto de teste");

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap'
}).addTo(map);

// ===== CONTORNO DO MUNICÍPIO (liga/desliga) =====
var camadaContornoMunicipio = L.layerGroup();

fetch("contorno.geojson")
  .then(r => r.json())
  .then(geo => {
    const contorno = L.geoJSON(geo, {
      style: {
        weight: 4,
        opacity: 1,
        fillOpacity: 0.05
      }
    });

    contorno.addTo(camadaContornoMunicipio);
    camadaContornoMunicipio.addTo(map); // aparece ao abrir

    // Ajusta zoom (opcional)
    try { map.fitBounds(contorno.getBounds()); } catch(e) {}
  })
  .catch(err => console.error("Erro ao carregar contorno.geojson:", err));

// ===== CAMADAS (B) =====
var camadaComunidadesRurais = L.layerGroup();
var camadaBairrosSede = L.layerGroup();
var camadaServicosPublicos = L.layerGroup();
var camadaEducacao = L.layerGroup();
var camadaSaude = L.layerGroup();
var camadaCultura = L.layerGroup();

// Controle de camadas (liga/desliga)
var camadas = {
  "Comunidades Rurais": camadaComunidadesRurais,
  "Bairros Sede": camadaBairrosSede,
  "Serviços Públicos": camadaServicosPublicos,
  "Educação": camadaEducacao,
  "Saúde": camadaSaude,
  "Cultura": camadaCultura
};

var overlays = Object.assign(
  { "Contorno do Município": camadaContornoMunicipio },
  camadas
);

L.control.layers(null, overlays, { collapsed: false }).addTo(map);

// ===== LEGENDA DOS ÍCONES =====
var legenda = L.control({ position: "bottomright" });

legenda.onAdd = function () {
  var div = L.DomUtil.create("div", "legenda-icones");

  div.innerHTML = `
    <div style="
      background:#fff;
      padding:10px 12px;
      border-radius:10px;
      box-shadow:0 2px 10px rgba(0,0,0,.15);
      font-size:14px;
      min-width:190px;
    ">
      <div style="font-weight:bold;margin-bottom:8px">Legenda</div>

      <div style="display:flex;align-items:center;gap:8px;margin:6px 0">
        <img src="icons/rural.png" style="width:26px;height:26px" alt="Rural">
        <span>Comunidades Rurais</span>
      </div>

      <div style="display:flex;align-items:center;gap:8px;margin:6px 0">
        <img src="icons/educacao.png" style="width:26px;height:26px" alt="Educação">
        <span>Educação</span>
      </div>

      <div style="display:flex;align-items:center;gap:8px;margin:6px 0">
        <img src="icons/saude.png" style="width:26px;height:26px" alt="Saúde">
        <span>Saúde</span>
      </div>

      <div style="display:flex;align-items:center;gap:8px;margin:6px 0">
        <img src="icons/servicos.png" style="width:26px;height:26px" alt="Serviços Públicos">
        <span>Serviços Públicos</span>
      </div>

      <div style="display:flex;align-items:center;gap:8px;margin:6px 0">
        <img src="icons/cultura.png" style="width:26px;height:26px" alt="Cultura">
        <span>Cultura</span>
      </div>

      <div style="display:flex;align-items:center;gap:8px;margin:6px 0">
        <img src="icons/bairrossede.png" style="width:26px;height:26px" alt="Bairros Sede">
        <span>Bairros Sede</span>
      </div>
    </div>
  `;

  // não deixar a legenda “roubar” o arrastar/zoom do mapa
  L.DomEvent.disableClickPropagation(div);
  return div;
};

legenda.addTo(map);

// ===== REGRAS DE CLASSIFICAÇÃO =====
function normalizaNome(nome) {
  let n = (nome || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  n = n.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return n;
}

function categoriaPorNome(nome) {
  const n = normalizaNome(nome);

  // EDUCAÇÃO
  if (
    n.includes("escola") ||
    n.includes("colegio") ||
    n.includes("centro educacional") ||
    n.includes("aee") ||
    n.includes("atendimento educacional")
  ) return "educacao";

  // SAÚDE
  if (
    n.includes("hospital") ||
    n.includes("psf") ||
    n.includes("samu") ||
    n.includes("posto de saude") ||
    n.includes("pronto socorro") ||
    n.includes("farmacia") ||
    n.includes("farmacia basica") ||
    n.includes("unidade de saude")
  ) return "saude";

  // SERVIÇOS PÚBLICOS
  if (
    n.includes("prefeitura") ||
    n.includes("secretaria") ||
    n.includes("cras") ||
    n.includes("creas") ||
    n.includes("conselho tutelar") ||
    n.includes("setor de tributos") ||
    n.includes("mercado municipal") ||
    n.includes("cemiterio") ||
    n.includes("biblioteca municipal") ||
    n.includes("administracao") ||
    n.includes("financas") ||
    n.includes("planejamento")
  ) return "servicos";

  // CULTURA / LAZER / ESPORTE
  if (
    n.includes("praca") ||
    n.includes("quadra") ||
    n.includes("campo") ||
    n.includes("ginasio") ||
    n.includes("parque de exposicoes") ||
    n.includes("clube nautico") ||
    n.includes("campao")
  ) return "cultura";

  // // BAIRROS SEDE
if (
  n.includes("pedrinhas") ||
  n.includes("alto da boa vista") ||
  n.includes("centro") ||
  n.includes("bairro") ||
  n.includes("conjunto") ||
  n.includes("alto do") ||
  n.includes("alto da") ||
  n.includes("jardim") ||
  n.includes("venda velha")
) return "bairrossede";

  // PADRÃO
  return "rural";
}

// ===== ÍCONES + ADDPONTO =====
const _iconCache = {};

function normalizaCategoriaParaPadrao(cat) {
  let c = (cat || "").toString().trim().toLowerCase();
  c = c.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (c.includes("educ")) return "Educação";
  if (c.includes("saud")) return "Saúde";
  if (c.includes("serv")) return "Serviços Públicos";
  if (c.includes("cult")) return "Cultura";
  if (c.includes("bairrossede") || c.includes("sede")) return "Bairros Sede";
  if (c.includes("rural") || c.includes("comun")) return "Comunidades Rurais";

  if (c === "educacao") return "Educação";
  if (c === "saude") return "Saúde";
  if (c === "servicos" || c === "servico") return "Serviços Públicos";
  if (c === "cultura") return "Cultura";
  if (c === "bairrossede") return "Bairros Sede";

  return "Comunidades Rurais";
}

function iconPorCategoriaSeguro(cat) {
  const categoria = normalizaCategoriaParaPadrao(cat);

  // ✅ padronize nomes de arquivo: tudo minúsculo
  const arquivos = {
    "Comunidades Rurais": "icons/rural.png",
    "Educação": "icons/educacao.png",
    "Saúde": "icons/saude.png",
    "Serviços Públicos": "icons/servicos.png",
    "Cultura": "icons/cultura.png",
    "Bairros Sede": "icons/bairrossede.png"
  };

  const url = arquivos[categoria] || "icons/rural.png";
  const key = categoria + "|" + url;

  if (_iconCache[key]) return _iconCache[key];

  _iconCache[key] = L.icon({
    iconUrl: url,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  });

  return _iconCache[key];
}

function camadaPorCategoriaPadrao(categoria) {
  if (categoria === "Educação") return camadaEducacao;
  if (categoria === "Saúde") return camadaSaude;
  if (categoria === "Serviços Públicos") return camadaServicosPublicos;
  if (categoria === "Cultura") return camadaCultura;
  if (categoria === "Bairros Sede") return camadaBairrosSede;
  return camadaComunidadesRurais;
}

// Guarda todos os pontos para busca/listagem
var catalogo = [];

function addPonto(nome, lat, lng, item = {}) {
  const nomeLimpo = (nome || "").toString();
  const desc = (item.descricao || "").toString().trim();
  const id = item.id || "";

  let categoriaLabel = item.categoria ? normalizaCategoriaParaPadrao(item.categoria) : "";
  if (!categoriaLabel) categoriaLabel = normalizaCategoriaParaPadrao(categoriaPorNome(nomeLimpo));

  const camada = camadaPorCategoriaPadrao(categoriaLabel);

  const descLinha = desc
    ? (desc.length > 120 ? desc.slice(0, 120) + "…" : desc)
    : "Sem descrição ainda.";

  const html = `
    <div style="min-width:240px">
      <strong>${nomeLimpo}</strong><br/>
      <small><b>Categoria:</b> ${categoriaLabel}</small>
      <div style="margin-top:6px">${descLinha}</div>
      <div style="margin-top:8px">
        <a href="detalhe.html?id=${encodeURIComponent(id)}">Ver detalhes</a>
      </div>
    </div>
  `;

  let marker;
  try {
    marker = L.marker([lat, lng], { icon: iconPorCategoriaSeguro(categoriaLabel) });
  } catch (e) {
    console.warn("Falha ao criar ícone. Usando marcador padrão.", e);
    marker = L.marker([lat, lng]);
  }

  marker.addTo(camada).bindPopup(html);

  catalogo.push({
    nome: nomeLimpo,
    categoria: categoriaLabel,
    lat: lat,
    lng: lng,
    marker: marker
  });
}

// Camadas visíveis ao abrir
camadaComunidadesRurais.addTo(map);
camadaBairrosSede.addTo(map);
camadaServicosPublicos.addTo(map);
camadaEducacao.addTo(map);
camadaSaude.addTo(map);
camadaCultura.addTo(map);

// ===== BUSCA SIMPLES =====
var buscaBox = L.control({ position: "topright" });

buscaBox.onAdd = function () {
  var div = L.DomUtil.create("div", "busca-box");
  div.innerHTML = `
    <div style="background:#fff;padding:10px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.2);min-width:240px">
      <div style="font-weight:bold;margin-bottom:6px">Buscar ponto</div>
      <input id="buscaInput" type="text" placeholder="Digite um nome..." style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px" />
      <div id="buscaResultados" style="margin-top:8px;max-height:220px;overflow:auto;font-size:14px"></div>
    </div>
  `;
  L.DomEvent.disableClickPropagation(div);
  return div;
};

buscaBox.addTo(map);

function renderResultados(lista) {
  var el = document.getElementById("buscaResultados");
  if (!el) return;

  if (lista.length === 0) {
    el.innerHTML = "<em>Nenhum resultado.</em>";
    return;
  }

  el.innerHTML = lista.slice(0, 30).map(p => `
    <div style="padding:6px;border-bottom:1px solid #eee;cursor:pointer"
         onclick="irParaPonto('${p.nome.replace(/'/g, "\\'")}')">
      <b>${p.nome}</b><br><small>${p.categoria}</small>
    </div>
  `).join("");
}

window.irParaPonto = function(nome) {
  const p = catalogo.find(x => x.nome === nome);
  if (!p) return;
  map.setView([p.lat, p.lng], 16);
  p.marker.openPopup();
};

setTimeout(() => {
  var input = document.getElementById("buscaInput");
  if (!input) return;

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { renderResultados([]); return; }
    const res = catalogo.filter(p => p.nome.toLowerCase().includes(q));
    renderResultados(res);
  });
}, 0);

// ===== PONTOS (mantive como você enviou) =====
// ... seus addPonto(...) continuam iguais aqui ...

console.log("Teste categoria:", categoriaPorNome("Escola Municipal Anísio Teixeira"));
console.log("Teste categoria:", categoriaPorNome("Hospital Municipal São Sebastião"));
console.log("Teste categoria:", categoriaPorNome("Secretaria Municipal de Saúde"));

// ===== CARREGAR DADOS EXTERNOS (dados.json) =====
fetch("dados.json")
  .then(r => r.json())
  .then(lista => lista.forEach(item => addPonto(item.nome, item.lat, item.lng, item)))
  .catch(err => console.error("Erro ao carregar dados.json:", err));

