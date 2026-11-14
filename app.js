// Liga a interface ao motor de rotas e anima o motoboy.
const estado = {
  arestas: MAPA.arestas.map((a) => [...a]),
  pedidos: MAPA.pedidos.map((p) => ({ ...p })),
  modo: "hibrido",
};
const MODOS = {
  maisPerto: ["Mais perto primeiro", maisPerto, "Guloso: sempre vai ao ponto mais próximo"],
  porHorario: ["Por horário", porHorario, "Segue a ordem dos prazos do admin"],
  hibrido: ["Híbrido", hibrido, "Menos atrasos e, depois, menor tempo"],
};
const $ = (id) => document.getElementById(id);
const POS = Object.fromEntries(MAPA.nos.map((n) => [n.id, n]));
const nome = (id) => POS[id].nome;
// quarteirões decorativos para o mapa parecer um bairro
const QUADRAS = [[20,20,90,70],[190,100,70,60],[400,110,70,60],[590,230,90,70],[40,200,70,60],[200,250,70,50],[420,250,60,60],[580,20,50,60],[360,20,60,30],[20,340,70,50]];
let rotaAtual = null, raf = 0;

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
  for (const k in MODOS) res[k] = MODOS[k][1](matriz, ativos);
  return { prevs, res };
}
const pesoRua = (a, b) => estado.arestas.find((e) => (e[0] === a && e[1] === b) || (e[0] === b && e[1] === a))[2];

function pararAnim() { cancelAnimationFrame(raf); raf = 0; }

function render() {
  pararAnim();
  const { prevs, res } = calcular();
  const r = res[estado.modo];
  const usadas = new Set(), seq = {};
  const pts = [{ id: "Loja", t: 0 }];
  let atual = "Loja";
  r.ordem.forEach((id, i) => {
    const p = estado.pedidos.find((x) => x.id === id);
    const cam = caminho(prevs[atual], atual, p.destino);
    for (let k = 1; k < cam.length; k++) {
      usadas.add([cam[k - 1], cam[k]].sort().join("|"));
      pts.push({ id: cam[k], t: pts[pts.length - 1].t + pesoRua(cam[k - 1], cam[k]) });
    }
    (seq[p.destino] = seq[p.destino] || []).push(i + 1);
    atual = p.destino;
  });
  rotaAtual = { pts, chegadas: r.chegadas, total: r.distanciaTotal };
  const ativosDest = new Set(estado.pedidos.filter((p) => p.ativo).map((p) => p.destino));

  let svg = '<svg viewBox="0 0 720 400"><rect width="720" height="400" rx="10" fill="#eef3e6"/>';
  QUADRAS.forEach(([x, y, w, h], i) => (svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${i % 3 ? "#e1ead3" : "#f3ecdc"}"/>`));
  estado.arestas.forEach(([a, b]) => (svg += `<line x1="${POS[a].x}" y1="${POS[a].y}" x2="${POS[b].x}" y2="${POS[b].y}" stroke="#b8b0a2" stroke-width="12" stroke-linecap="round"/>`));
  estado.arestas.forEach(([a, b]) => {
    const on = usadas.has([a, b].sort().join("|"));
    svg += `<line class="rua ${on ? "on" : ""}" style="stroke:${on ? "#fb923c" : "#fff"};stroke-width:${on ? 7 : 8}" x1="${POS[a].x}" y1="${POS[a].y}" x2="${POS[b].x}" y2="${POS[b].y}" stroke-linecap="round"/>`;
  });
  svg += '<g id="anim"></g>';
  estado.arestas.forEach(([a, b, p], i) => {
    svg += `<text class="peso" data-aresta="${i}" x="${(POS[a].x + POS[b].x) / 2}" y="${(POS[a].y + POS[b].y) / 2 + 4}" text-anchor="middle">${p}</text>`;
  });
  MAPA.nos.forEach((n) => {
    const loja = n.id === "Loja", ativo = ativosDest.has(n.id);
    svg += `<g opacity="${loja || ativo ? 1 : 0.55}"><circle class="no ${loja ? "loja" : ativo ? "ativo" : ""}" cx="${n.x}" cy="${n.y}" r="${loja ? 26 : 20}"/>`;
    svg += `<text class="ic" x="${n.x}" y="${n.y + 6}">${n.icone}</text><text class="nome" x="${n.x}" y="${n.y + (loja ? 42 : 36)}">${n.nome}</text></g>`;
    if (seq[n.id]) svg += `<circle class="badge" cx="${n.x + 18}" cy="${n.y - 18}" r="11"/><text class="bn" x="${n.x + 18}" y="${n.y - 14}">${seq[n.id].join(",")}</text>`;
  });
  $("mapa").innerHTML = svg + "</svg>";
  $("relogio").textContent = "⏱ 0.0 s";

  $("pedidos").innerHTML = "<table>" + estado.pedidos.map((p) =>
    `<tr><td><input type="checkbox" data-ped="${p.id}" ${p.ativo ? "checked" : ""}></td><td>Pedido ${p.id} → <b>${nome(p.destino)}</b></td><td>prazo <input type="number" min="1" data-prazo="${p.id}" value="${p.prazo}"> min</td></tr>`).join("") + "</table>";

  $("modos").innerHTML = Object.keys(MODOS).map((k) => {
    const x = res[k];
    return `<div class="modo ${k === estado.modo ? "sel" : ""}" data-modo="${k}"><b>${MODOS[k][0]}</b><small>${MODOS[k][2]}</small><br>Tempo total: <b>${x.distanciaTotal} min</b> · Atrasos: <span class="${x.atrasados.length ? "bad" : "good"}">${x.atrasados.length}</span></div>`;
  }).join("");

  $("detalhe").innerHTML = r.chegadas.length
    ? `<p class="perc"><b>Percurso:</b> ${pts.map((p) => nome(p.id)).join(" → ")}</p><ol>` + r.chegadas.map((c) => `<li>Pedido ${c.id} → ${nome(c.destino)}: chega em ${c.chegada} min (prazo ${c.prazo}) <span class="${c.atrasado ? "bad" : "good"}">${c.atrasado ? "ATRASADO" : "no prazo"}</span> <span id="ent-${c.id}"></span></li>`).join("") + "</ol>"
    : "<p>Nenhum pedido ativo.</p>";
}

// ---- animação ----
function desenhar(tSim, vel) {
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
    const el = $("ent-" + c.id);
    if (c.chegada <= tSim) {
      g += `<text x="${POS[c.destino].x - 20}" y="${POS[c.destino].y - 16}" font-size="18">${c.atrasado ? "⚠️" : "✅"}</text>`;
      if (el) el.textContent = `🛵 entregue aos ${(c.chegada / vel).toFixed(1)} s`;
    } else if (el) el.textContent = "";
  });
  g += `<text class="moto" x="${x}" y="${y + 9}">🛵</text>`;
  $("anim").innerHTML = g;
  $("relogio").textContent = `⏱ ${(tSim / vel).toFixed(1)} s reais · ${tSim.toFixed(1)} min simulados`;
}

function iniciar() {
  pararAnim();
  if (!rotaAtual || rotaAtual.total === 0) return;
  const vel = +$("vel").value; // minutos simulados por segundo real
  const t0 = performance.now();
  const frame = (now) => {
    const tSim = Math.min(((now - t0) / 1000) * vel, rotaAtual.total);
    desenhar(tSim, vel);
    if (tSim < rotaAtual.total) raf = requestAnimationFrame(frame);
    else $("relogio").textContent = `✅ Rota concluída em ${(tSim / vel).toFixed(1)} s (${tSim} min simulados)`;
  };
  raf = requestAnimationFrame(frame);
}

document.addEventListener("click", (e) => {
  const m = e.target.closest("[data-modo]");
  if (m) { estado.modo = m.dataset.modo; render(); }
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
$("iniciar").onclick = iniciar;
$("reset").onclick = () => {
  estado.arestas = MAPA.arestas.map((a) => [...a]);
  estado.pedidos = MAPA.pedidos.map((p) => ({ ...p }));
  render();
};
render();
