// Interface: desenha o mapa, os painéis e a animação do motoboy.
const $ = (id) => document.getElementById(id);
const POS = Object.fromEntries(MAPA.nos.map((n) => [n.id, n]));
const nome = (id) => POS[id].nome;

const MODOS = {
  maisPerto: { titulo: "Mais perto primeiro", desc: "Guloso: sempre vai ao ponto mais próximo", fn: maisPerto },
  porHorario: { titulo: "Por horário", desc: "Segue a ordem dos prazos do admin", fn: porHorario },
  hibrido: { titulo: "Híbrido", desc: "Menos atrasos e, depois, menor tempo", fn: hibrido },
};
// quarteirões decorativos: [x, y, largura, altura]
const QUADRAS = [[20,20,90,70],[190,100,70,60],[400,110,70,60],[590,230,90,70],[40,200,70,60],[200,250,70,50],[420,250,60,60],[580,20,50,60],[360,20,60,30],[20,340,70,50]];

const estado = { arestas: [], pedidos: [], modo: "hibrido" };
let rotaAtual = null, raf = 0;

function resetarEstado() {
  estado.arestas = MAPA.arestas.map((a) => [...a]);
  estado.pedidos = MAPA.pedidos.map((p) => ({ ...p }));
}

// ---------- cálculo ----------
function calcular() {
  const g = new Grafo();
  estado.arestas.forEach(([a, b, p]) => g.addAresta(a, b, p));
  const matriz = {}, prevs = {};
  for (const n of MAPA.nos) {
    const r = dijkstra(g, n.id);
    matriz[n.id] = Object.fromEntries(r.dist);
    prevs[n.id] = r.prev;
  }
  const ativos = estado.pedidos.filter((p) => p.ativo);
  const res = {};
  for (const k in MODOS) res[k] = MODOS[k].fn(matriz, ativos);
  return { prevs, res };
}

const pesoRua = (a, b) =>
  estado.arestas.find((e) => (e[0] === a && e[1] === b) || (e[0] === b && e[1] === a))[2];

// Transforma a ordem de entregas em pontos do percurso com o tempo acumulado.
function montarRota(prevs, r) {
  const pts = [{ id: "Loja", t: 0 }], usadas = new Set(), seq = {};
  let atual = "Loja";
  r.ordem.forEach((id, i) => {
    const destino = estado.pedidos.find((x) => x.id === id).destino;
    const cam = caminho(prevs[atual], atual, destino);
    for (let k = 1; k < cam.length; k++) {
      usadas.add([cam[k - 1], cam[k]].sort().join("|"));
      pts.push({ id: cam[k], t: pts[pts.length - 1].t + pesoRua(cam[k - 1], cam[k]) });
    }
    (seq[destino] = seq[destino] || []).push(i + 1);
    atual = destino;
  });
  return { pts, usadas, seq, chegadas: r.chegadas, total: r.distanciaTotal };
}

// ---------- HTML / SVG ----------
function htmlMapa(rota) {
  const ativos = new Set(estado.pedidos.filter((p) => p.ativo).map((p) => p.destino));
  const linha = (a, b, extra) => `<line x1="${POS[a].x}" y1="${POS[a].y}" x2="${POS[b].x}" y2="${POS[b].y}" stroke-linecap="round" ${extra}/>`;
  let s = '<svg viewBox="0 0 720 400"><rect width="720" height="400" rx="10" fill="#eef3e6"/>';
  QUADRAS.forEach(([x, y, w, h], i) => (s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${i % 3 ? "#e1ead3" : "#f3ecdc"}"/>`));
  estado.arestas.forEach(([a, b]) => (s += linha(a, b, 'stroke="#b8b0a2" stroke-width="12"')));
  estado.arestas.forEach(([a, b]) => {
    const on = rota.usadas.has([a, b].sort().join("|"));
    s += linha(a, b, `stroke="${on ? "#fb923c" : "#fff"}" stroke-width="${on ? 7 : 8}"`);
  });
  s += '<g id="anim"></g>';
  estado.arestas.forEach(([a, b, p], i) => {
    s += `<text class="peso" data-aresta="${i}" x="${(POS[a].x + POS[b].x) / 2}" y="${(POS[a].y + POS[b].y) / 2 + 4}" text-anchor="middle">${p}</text>`;
  });
  MAPA.nos.forEach((n) => {
    const loja = n.id === "Loja", ativo = ativos.has(n.id);
    s += `<g opacity="${loja || ativo ? 1 : 0.55}"><circle class="no ${loja ? "loja" : ativo ? "ativo" : ""}" cx="${n.x}" cy="${n.y}" r="${loja ? 26 : 20}"/>`;
    s += `<text class="ic" x="${n.x}" y="${n.y + 6}">${n.icone}</text><text class="nome" x="${n.x}" y="${n.y + (loja ? 42 : 36)}">${n.nome}</text></g>`;
    if (rota.seq[n.id]) s += `<circle class="badge" cx="${n.x + 18}" cy="${n.y - 18}" r="11"/><text class="bn" x="${n.x + 18}" y="${n.y - 14}">${rota.seq[n.id].join(",")}</text>`;
  });
  return s + "</svg>";
}

const htmlPedidos = () => "<table>" + estado.pedidos.map((p) =>
  `<tr><td><input type="checkbox" data-ped="${p.id}" ${p.ativo ? "checked" : ""}></td><td>Pedido ${p.id} → <b>${nome(p.destino)}</b></td><td>prazo <input type="number" min="1" data-prazo="${p.id}" value="${p.prazo}"> min</td></tr>`).join("") + "</table>";

const htmlModos = (res) => Object.keys(MODOS).map((k) => {
  const x = res[k], m = MODOS[k];
  return `<div class="modo ${k === estado.modo ? "sel" : ""}" data-modo="${k}"><b>${m.titulo}</b><small>${m.desc}</small><br>Tempo total: <b>${x.distanciaTotal} min</b> · Atrasos: <span class="${x.atrasados.length ? "bad" : "good"}">${x.atrasados.length}</span></div>`;
}).join("");

function htmlDetalhe(rota) {
  if (!rota.chegadas.length) return "<p>Nenhum pedido ativo.</p>";
  const itens = rota.chegadas.map((c) =>
    `<li>Pedido ${c.id} → ${nome(c.destino)}: chega em ${c.chegada} min (prazo ${c.prazo}) <span class="${c.atrasado ? "bad" : "good"}">${c.atrasado ? "ATRASADO" : "no prazo"}</span> <span id="ent-${c.id}"></span></li>`).join("");
  return `<p class="perc"><b>Percurso:</b> ${rota.pts.map((p) => nome(p.id)).join(" → ")}</p><ol>${itens}</ol>`;
}

function render() {
  cancelAnimationFrame(raf);
  const { prevs, res } = calcular();
  rotaAtual = montarRota(prevs, res[estado.modo]);
  $("mapa").innerHTML = htmlMapa(rotaAtual);
  $("pedidos").innerHTML = htmlPedidos();
  $("modos").innerHTML = htmlModos(res);
  $("detalhe").innerHTML = htmlDetalhe(rotaAtual);
  $("relogio").textContent = "⏱ 0.0 s";
}

// ---------- animação do motoboy ----------
function desenharQuadro(tSim, vel) {
  const { pts, chegadas } = rotaAtual;
  let k = 0;
  while (k < pts.length - 1 && pts[k + 1].t <= tSim) k++;
  const a = pts[k], b = pts[Math.min(k + 1, pts.length - 1)];
  const f = b.t > a.t ? (tSim - a.t) / (b.t - a.t) : 0;
  const x = POS[a.id].x + (POS[b.id].x - POS[a.id].x) * f;
  const y = POS[a.id].y + (POS[b.id].y - POS[a.id].y) * f;
  const trilha = pts.slice(0, k + 1).map((p) => `${POS[p.id].x},${POS[p.id].y}`).concat(`${x},${y}`).join(" ");
  let g = `<polyline class="trilha" points="${trilha}"/>`;
  chegadas.forEach((c) => {
    const el = $("ent-" + c.id), entregue = c.chegada <= tSim;
    if (entregue) g += `<text x="${POS[c.destino].x - 20}" y="${POS[c.destino].y - 16}" font-size="18">${c.atrasado ? "⚠️" : "✅"}</text>`;
    if (el) el.textContent = entregue ? `🛵 entregue aos ${(c.chegada / vel).toFixed(1)} s` : "";
  });
  g += `<text class="moto" x="${x}" y="${y + 9}">🛵</text>`;
  $("anim").innerHTML = g;
  $("relogio").textContent = `⏱ ${(tSim / vel).toFixed(1)} s reais · ${tSim.toFixed(1)} min simulados`;
}

function iniciarEntrega() {
  cancelAnimationFrame(raf);
  if (!rotaAtual || rotaAtual.total === 0) return;
  const vel = +$("vel").value; // minutos simulados por segundo real
  const t0 = performance.now();
  const quadro = (agora) => {
    const tSim = Math.min(((agora - t0) / 1000) * vel, rotaAtual.total);
    desenharQuadro(tSim, vel);
    if (tSim < rotaAtual.total) raf = requestAnimationFrame(quadro);
    else $("relogio").textContent = `✅ Rota concluída em ${(tSim / vel).toFixed(1)} s (${tSim} min simulados)`;
  };
  raf = requestAnimationFrame(quadro);
}

// ---------- eventos ----------
document.addEventListener("click", (e) => {
  const modo = e.target.closest("[data-modo]");
  if (modo) { estado.modo = modo.dataset.modo; render(); }
  if (e.target.dataset.aresta !== undefined) {
    const a = estado.arestas[+e.target.dataset.aresta];
    const v = parseInt(prompt(`Tempo de ${nome(a[0])} ↔ ${nome(a[1])} (min):`, a[2]), 10);
    if (v > 0) { a[2] = v; render(); }
  }
});
document.addEventListener("change", (e) => {
  const d = e.target.dataset;
  if (d.ped) estado.pedidos.find((p) => p.id == d.ped).ativo = e.target.checked;
  if (d.prazo) estado.pedidos.find((p) => p.id == d.prazo).prazo = Math.max(1, +e.target.value || 1);
  if (d.ped || d.prazo) render();
});
$("iniciar").onclick = iniciarEntrega;
$("reset").onclick = () => { resetarEstado(); render(); };

resetarEstado();
render();
