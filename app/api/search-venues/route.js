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
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        system: `Sei un assistente per event planner professionisti in Veneto, Italia.
Il criterio di valutazione PRINCIPALE è: la location affitta lo spazio in modo ESCLUSIVO senza obbligo di catering interno? L'event planner porta i propri servizi (catering, animazione, ecc.).

SISTEMA DI PUNTEGGIO (score da 0 a 100):
- 100: Sala/spazio esclusivo affittabile, nessun catering interno obbligatorio
- 80-90: Spazio esclusivo disponibile, catering interno opzionale (non obbligatorio)
- 50-70: Spazio disponibile ma politica catering non chiara, da verificare
- 20-40: Catering interno OBBLIGATORIO, no fornitori esterni
- 10: Nessuna sala eventi disponibile

Cerca location REALI a ${city} (Veneto): ville storiche, agriturismi, parchi, musei, dimore, centri sportivi, resort, cantine vinicole, cascine, spazi industriali riconvertiti.

Rispondi SOLO con JSON valido, zero markdown, zero testo extra:
{
  "venues": [
    {
      "name": "Nome esatto",
      "type": "Tipo (Villa storica / Agriturismo / ecc.)",
      "score": 95,
      "address": "Indirizzo completo",
      "phone": "telefono se trovato",
      "website": "URL se trovato",
      "why": "Spiegazione concisa del punteggio",
      "signals": ["segnale1", "segnale2"],
      "note": "Consiglio pratico per contattarli come event planner",
      "lat": 45.4064,
      "lng": 11.8768
    }
  ],
  "city": "${city}",
  "total": 6
}
Trova almeno 5-6 location. Includi coordinate lat/lng approssimative per ciascuna.`,
        messages: [{
          role: "user",
          content: `Cerca location a ${city} (Veneto) per evento: ${type}. Priorità a spazi esclusivi senza catering obbligatorio.`
        }]
      })
    });

    const data = await response.json();
    const text = (data.content || [])
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("");

    const match = text.replace(/```json|```/g, "").trim().match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Risposta AI non valida");

    const parsed = JSON.parse(match[0]);
    return NextResponse.json(parsed);

  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
