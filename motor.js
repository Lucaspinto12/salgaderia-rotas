// Motor lógico: grafo, Dijkstra e os 3 modos de rota.

// Grafo não direcionado e ponderado (lista de adjacência).
class Grafo {
  constructor() { this.adj = new Map(); }
  addAresta(a, b, peso) {
    for (const n of [a, b]) if (!this.adj.has(n)) this.adj.set(n, []);
    this.adj.get(a).push({ para: b, peso });
    this.adj.get(b).push({ para: a, peso });
  }
}

// Dijkstra simples O(V^2): suficiente para o grafo pequeno da demonstração.
function dijkstra(grafo, origem) {
  const dist = new Map(), prev = new Map(), visto = new Set();
  for (const n of grafo.adj.keys()) dist.set(n, Infinity);
  dist.set(origem, 0);
  while (true) {
    let u = null;
    for (const [n, d] of dist)
      if (!visto.has(n) && d < Infinity && (u === null || d < dist.get(u))) u = n;
    if (u === null) break;
    visto.add(u);
    for (const { para, peso } of grafo.adj.get(u)) {
      if (dist.get(u) + peso < dist.get(para)) {
        dist.set(para, dist.get(u) + peso);
        prev.set(para, u);
      }
    }
  }
  return { dist, prev };
}

// Reconstrói o caminho origem -> destino a partir do mapa "prev".
function caminho(prev, origem, destino) {
  const p = [destino];
  let c = destino;
  while (c !== origem) {
    c = prev.get(c);
    if (c === undefined) return [];
    p.unshift(c);
  }
  return p;
}

// Calcula tempos de chegada e atrasos de uma ordem de entregas.
// matriz[a][b] = menor tempo entre a e b.
function avaliar(matriz, ordem, pedidos) {
  let atual = "Loja", t = 0;
  const chegadas = ordem.map((id) => {
    const p = pedidos.find((x) => x.id === id);
    t += matriz[atual][p.destino];
    atual = p.destino;
    return { id, destino: p.destino, chegada: t, prazo: p.prazo, atrasado: t > p.prazo };
  });
  return { ordem, chegadas, distanciaTotal: t, atrasados: chegadas.filter((c) => c.atrasado).map((c) => c.id) };
}

// Modo 1: guloso (vizinho mais próximo).
function maisPerto(m, pedidos) {
  const resto = [...pedidos], ordem = [];
  let atual = "Loja";
  while (resto.length) {
    let bi = 0;
    for (let i = 1; i < resto.length; i++)
      if (m[atual][resto[i].destino] < m[atual][resto[bi].destino]) bi = i;
    const [p] = resto.splice(bi, 1);
    ordem.push(p.id);
    atual = p.destino;
  }
  return avaliar(m, ordem, pedidos);
}

// Modo 2: segue o prazo definido pelo admin.
function porHorario(m, pedidos) {
  const ordem = [...pedidos].sort((a, b) => a.prazo - b.prazo).map((p) => p.id);
  return avaliar(m, ordem, pedidos);
}

// Modo 3: híbrido. Backtracking com poda: menos atrasos e, depois, menor tempo.
function hibrido(m, pedidos) {
  const n = pedidos.length;
  if (n > 10) return maisPerto(m, pedidos); // problema NP-difícil: acima disso, só heurística
  let melhor = null;
  const usados = [];
  function buscar(ordem, atual, t, atrasos) {
    if (melhor && (atrasos > melhor.atrasados.length ||
        (atrasos === melhor.atrasados.length && t >= melhor.distanciaTotal))) return; // poda
    if (ordem.length === n) { melhor = avaliar(m, ordem, pedidos); return; }
    pedidos.forEach((p, i) => {
      if (usados[i]) return;
      const nt = t + m[atual][p.destino];
      usados[i] = true;
      buscar([...ordem, p.id], p.destino, nt, atrasos + (nt > p.prazo ? 1 : 0));
      usados[i] = false;
    });
  }
  buscar([], "Loja", 0, 0);
  return melhor || avaliar(m, [], pedidos);
}
