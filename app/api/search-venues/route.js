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
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        system: `Sei un assistente per event planner professionisti in Veneto, Italia.
Il criterio di valutazione PRINCIPALE è: la location affitta lo spazio in modo ESCLUSIVO senza obbligo di catering interno? L'event planner porta i propri servizi (catering, animazione, ecc.).

SISTEMA DI PUNTEGGIO (score da 0 a 100):
- 100: Sala/spazio esclusivo affittabile, nessun catering interno obbligatorio
- 80-90: Spazio esclusivo disponibile, catering interno opzionale (non obbligatorio)
- 50-70: Spazio disponibile ma politica catering non chiara, da verificare
- 20-40: Catering interno OBBLIGATORIO, no fornitori esterni
- 10: Nessuna sala eventi disponibile

Conosci bene il Veneto. Suggerisci location REALI e plausibili: ville storiche, agriturismi, parchi, musei, dimore, centri sportivi, resort, cantine vinicole, cascine.

Rispondi SOLO con JSON valido, zero markdown, zero testo extra, zero backtick.`,
        messages: [{
          role: "user",
          content: `Trova 6 location a ${city} (Veneto) adatte per: ${type}. Priorità assoluta a spazi esclusivi senza catering obbligatorio.

Rispondi SOLO con questo JSON (niente altro):
{
  "venues": [
    {
      "name": "Nome location",
      "type": "Tipo (Villa storica / Agriturismo / ecc.)",
      "score": 95,
      "address": "Indirizzo, Comune (PD)",
      "phone": "",
      "website": "",
      "why": "Spiegazione del punteggio",
      "signals": ["segnale1", "segnale2"],
      "note": "Consiglio pratico",
      "lat": 45.4064,
      "lng": 11.8768
    }
  ],
  "city": "${city}",
  "total": 6
}`
        }]
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("Anthropic API error:", response.status, errBody);
      return NextResponse.json({ error: `Errore API Anthropic: ${response.status} — ${errBody}` }, { status: 500 });
    }

    const data = await response.json();
    console.log("Anthropic OK, blocks:", data.content?.length);

    const text = (data.content || [])
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("");

    console.log("Raw AI text (first 300):", text.substring(0, 300));

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