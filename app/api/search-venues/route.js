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
        max_tokens: 4000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        system: `Sei un assistente per event planner professionisti in Veneto, Italia.
Devi cercare location REALI usando la ricerca web. Non inventare mai nomi o indirizzi.

Il criterio PRINCIPALE è: la location affitta lo spazio in modo ESCLUSIVO senza obbligo di catering interno?

SISTEMA DI PUNTEGGIO:
- 100: Sala esclusiva, nessun catering obbligatorio, l'organizzatore porta i suoi fornitori
- 80-90: Spazio esclusivo, catering interno opzionale
- 50-70: Politica catering non chiara, da verificare telefonicamente
- 20-40: Catering interno OBBLIGATORIO
- 10: Nessuna sala eventi

IMPORTANTE: Usa la ricerca web per trovare location VERE. Cerca su Google, siti di eventi, TripAdvisor ecc.
Se non trovi abbastanza risultati reali, meglio restituirne 3 certi che 6 inventati.

Rispondi SOLO con JSON valido, zero markdown, zero backtick:
{
  "venues": [
    {
      "name": "Nome reale trovato online",
      "type": "Tipo",
      "score": 85,
      "address": "Indirizzo reale",
      "phone": "telefono se trovato",
      "website": "URL reale se trovato",
      "why": "Perché questo punteggio",
      "signals": ["elemento trovato online 1", "elemento trovato online 2"],
      "note": "Consiglio pratico",
      "lat": 45.4064,
      "lng": 11.8768
    }
  ],
  "city": "nome città",
  "total": 5
}`,
        messages: [{
          role: "user",
          content: `Cerca su web location REALI a ${city} (Veneto, Italia) per organizzare: ${type}. 
Priorità a spazi esclusivi senza catering obbligatorio.
Cerca termini come: "sala eventi ${city}", "location ${city} compleanno", "villa affitto ${city} eventi", "agriturismo ${city} sala".
Trova solo luoghi che esistono davvero — verifica che siano reali prima di includerli.`
        }]
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("Anthropic API error:", response.status, errBody);
      return NextResponse.json({ error: `Errore API Anthropic: ${response.status}` }, { status: 500 });
    }

    const data = await response.json();
    console.log("Anthropic OK, blocks:", data.content?.length);

    const text = (data.content || [])
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("");

    console.log("Raw AI text (first 500):", text.substring(0, 500));

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