// Dados fixos do mapa (sem banco de dados). Peso das ruas = minutos de moto.
const MAPA = {
  nos: [
    { id: "Loja", nome: "Nosh Salgados", icone: "🥟", x: 350, y: 200 },
    { id: "A", nome: "Praça", icone: "🌳", x: 140, y: 80 },
    { id: "B", nome: "Escola", icone: "🏫", x: 140, y: 320 },
    { id: "C", nome: "Hospital", icone: "🏥", x: 300, y: 50 },
    { id: "D", nome: "Mercado", icone: "🛒", x: 300, y: 350 },
    { id: "E", nome: "Academia", icone: "🏋️", x: 500, y: 60 },
    { id: "F", nome: "Igreja", icone: "⛪", x: 560, y: 200 },
    { id: "G", nome: "Clube", icone: "🏊", x: 500, y: 340 },
    { id: "H", nome: "Condomínio", icone: "🏢", x: 650, y: 120 },
  ],
  arestas: [
    ["Loja", "A", 6], ["Loja", "B", 6], ["Loja", "C", 8], ["Loja", "D", 7],
    ["Loja", "F", 9], ["A", "C", 5], ["A", "B", 9], ["B", "D", 6],
    ["C", "E", 7], ["D", "G", 8], ["E", "H", 5], ["F", "H", 6],
    ["F", "G", 6], ["E", "F", 7],
  ],
  // prazo = minutos máximos após a saída da loja (definido pelo admin)
  pedidos: [
    { id: 1, destino: "A", prazo: 12, ativo: true },
    { id: 2, destino: "H", prazo: 30, ativo: true },
    { id: 3, destino: "B", prazo: 20, ativo: true },
    { id: 4, destino: "E", prazo: 25, ativo: true },
    { id: 5, destino: "G", prazo: 45, ativo: true },
    { id: 6, destino: "D", prazo: 50, ativo: true },
    { id: 7, destino: "C", prazo: 40, ativo: false },
    { id: 8, destino: "F", prazo: 40, ativo: false },
  ],
};
