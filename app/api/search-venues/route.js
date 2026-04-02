// app/api/search-venues/route.js

import { NextResponse } from "next/server";

export async function POST(request) {
  const { city, type } = await request.json();

  if (!city || !type) {
    return NextResponse.json({ error: "city e type sono obbligatori" }, { status: 400 });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "web-search-2025-03-05",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 5000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        system: `Sei un assistente per un event planner veneto esperto in feste private: compleanni (18°, 30°, 40°, 50°, 60°), lauree, battesimi, comunioni, anniversari. Porta sempre catering e fornitori suoi — cerca solo spazi affittabili.

CRITERIO UNICO DI SELEZIONE: il posto affitta lo spazio in modo esclusivo senza imporre catering interno?
Non importa se è un agriturismo, una villa, un capannone — importa solo se puoi portare i tuoi fornitori.

SEGNALI POSITIVI da cercare:
- "affitto spazi" / "noleggio sala" / "sala disponibile per eventi privati"
- "portate il vostro catering" / "catering esterno ammesso"  
- Sala separata dall'attività principale (non il ristorante stesso)
- Strutture con più sale indipendenti affittabili

SEGNALI NEGATIVI da ignorare:
- "pacchetto tutto incluso" / "menu obbligatorio"
- Location che parlano SOLO di matrimoni
- Ristoranti che affittano solo con il loro menu

RAGGIO DI RICERCA: non limitarti al comune esatto. Includi comuni entro 15 minuti di auto — paesi limitrofi, frazioni, provincia.

STRATEGIA DI RICERCA — fai queste ricerche in sequenza:
1. "affitto sala feste [città] provincia" 
2. "sala ricevimenti [città] catering esterno"
3. "location [tipo evento] [città] e dintorni"
4. "dove fare festa [tipo evento] [città]" (articoli e blog locali)
5. "[città] sala privata affitto ore"

Gli articoli di blog tipo "dove festeggiare la laurea a [città]" sono OTTIMI — citano posti nascosti che non si trovano cercando direttamente.

SCORE (0-100) — solo su: posso affittare lo spazio portando tutto dall'esterno?
100=confermato online, 80=molto probabile, 50=da verificare al telefono, 20=improbabile, 10=no

Rispondi SOLO con JSON valido, no markdown, no backtick:
{"venues":[{"name":"","type":"","score":0,"address":"","phone":"","website":"","why":"spiegazione concisa","signals":["segnale trovato online"],"note":"cosa chiedere quando chiami","lat":0,"lng":0}],"city":"","total":0}

Minimo 5 risultati reali verificati. Mai inventare nomi o indirizzi.`,
        messages: [{
          role: "user",
          content: `Trova location per: ${type} a ${city} (Veneto) e dintorni entro 15 minuti di auto.

Inizia cercando articoli e liste tipo "dove festeggiare ${type.toLowerCase()} a ${city}" — spesso citano posti nascosti ottimi.
Poi cerca direttamente con "affitto sala ${city}" e "sala feste ${city} provincia".
Includi anche comuni vicini a ${city}.`
        }]
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("Anthropic API error:", response.status, errBody);
      return NextResponse.json({ error: `Errore API Anthropic: ${response.status}` }, { status: 500 });
    }

    const data = await response.json();
    const text = (data.content || [])
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("");

    const clean = text.replace(/```json|```/g, "").trim();
    const match = clean.match(/\{[\s\S]*\}/);

    if (!match) {
      console.error("Nessun JSON trovato. Raw:", text);
      return NextResponse.json({ error: "Risposta AI non valida" }, { status: 500 });
    }

    const parsed = JSON.parse(match[0]);
    return NextResponse.json(parsed);

  } catch (e) {
    console.error("Errore route:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}