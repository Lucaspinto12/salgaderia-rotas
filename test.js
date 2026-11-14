// Teste rápido no Node: npm test
const { MAPA } = require("./core/mapa");
const { Grafo } = require("./core/grafo");
const { dijkstra } = require("./core/dijkstra");
const { maisPerto, porHorario, hibrido } = require("./core/rotas");
const g = new Grafo();
MAPA.arestas.forEach(([a, b, p]) => g.addAresta(a, b, p));
const m = {};
for (const n of MAPA.nos) m[n.id] = Object.fromEntries(dijkstra(g, n.id).dist);
const ped = MAPA.pedidos.filter((p) => p.ativo);
const r = { maisPerto: maisPerto(m, ped), porHorario: porHorario(m, ped), hibrido: hibrido(m, ped) };
for (const k in r) console.log(k, r[k].ordem.join(">"), "tempo", r[k].distanciaTotal, "atrasados", r[k].atrasados);
const ok = r.hibrido.atrasados.length <= Math.min(r.maisPerto.atrasados.length, r.porHorario.atrasados.length);
console.log(ok ? "OK: híbrido nunca atrasa mais que os outros" : "FALHOU");
process.exit(ok ? 0 : 1);
