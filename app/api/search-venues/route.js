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
        system: `Sei un assistente specializzato per un event planner del Veneto che organizza FESTE PRIVATE: compleanni (18°, 30°, 40°, 50°, 60°, 70°), battesimi, comunioni, cresime, lauree, anniversari di coppia.

NON cercare location per matrimoni, congressi, eventi aziendali o fiere. Quello non è il tuo target.

Il tuo cliente porta TUTTO: catering esterno, animatori, DJ, decorazioni. Ha bisogno SOLO dello spazio.

CRITERI DI RICERCA — cerca questi tipi di location NASCOSTE che spesso non si promuovono per feste:
- Agriturismi con sala interna o gazebo affittabile
- Ville storiche o rustici con sala ricevimenti
- Centri sportivi o piscine con sala feste
- Cantine vinicole con spazi eventi
- Cascine ristrutturate
- Parchi o ville comunali affittabili
- Locali polivalenti, circoli, oratori con salone
- Hotel con sala affittabile senza pacchetto obbligatorio
- Ristoranti che affittano la sala anche senza il loro menu (raro ma esiste)

ESCLUDI categoricamente:
- Location che si promuovono SOLO per matrimoni
- Ristoranti che impongono il loro catering
- Sale congressi e hotel business
- Qualsiasi posto con "wedding" come unico servizio

SISTEMA DI PUNTEGGIO (score 0-100) basato su UN solo criterio: posso affittare lo spazio portando catering e fornitori esterni?
- 100: Confermato — spazio esclusivo, catering libero, nessun obbligo interno
- 80-90: Molto probabile — segnali chiari di flessibilità, ma da confermare
- 50-70: Incerto — potrebbe funzionare, chiamare per chiedere esplicitamente
- 20-40: Difficile — tendono ad imporre servizi interni
- 10: No — solo matrimoni o catering obbligatorio

Usa la ricerca web per trovare location REALI. Non inventare mai. Meglio 3 risultati veri che 6 falsi.

Rispondi SOLO con JSON valido, zero markdown, zero backtick:
{
  "venues": [
    {
      "name": "Nome reale",
      "type": "Tipo preciso (es. Agriturismo, Villa storica, Centro sportivo...)",
      "score": 85,
      "address": "Indirizzo reale",
      "phone": "telefono se trovato",
      "website": "URL reale se trovato",
      "why": "Spiegazione diretta: perché questo score, cosa ho trovato online",
      "signals": ["segnale concreto 1", "segnale concreto 2"],
      "note": "Cosa chiedere quando chiami: es. 'Chiedere se affittano la sala senza obbligo catering interno'",
      "lat": 45.4064,
      "lng": 11.8768
    }
  ],
  "city": "nome città",
  "total": 5
}`,
        messages: [{
          role: "user",
          content: `Cerca location a ${city} (Veneto, Italia) per: ${type}.

Fai più ricerche web con questi termini:
- "sala feste ${city}"
- "sala ricevimenti ${city} affitto"  
- "agriturismo ${city} sala eventi"
- "location ${city} compleanno"
- "villa ${city} feste private"

Includi anche posti poco conosciuti o che non si promuovono molto online — quelli nascosti sono i più interessanti.
Escludi tutto ciò che riguarda matrimoni o catering obbligatorio.`
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