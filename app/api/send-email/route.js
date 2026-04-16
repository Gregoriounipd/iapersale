// app/api/send-email/route.js
// npm install nodemailer

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

// Varianti casuali per sembrare scritto a mano
const INTRO_VARIANTS = [
  "Buongiorno, mi chiamo Gregorio.",
  "Salve, sono Gregorio.",
  "Ciao, mi chiamo Gregorio.",
];

const CLOSING_VARIANTS = [
  "Grazie mille, aspetto vostre notizie.",
  "Grazie in anticipo per la risposta.",
  "Resto in attesa, grazie.",
];

const EVENT_LABELS = {
  "Compleanno": "un compleanno",
  "Battesimo": "un battesimo",
  "Comunione": "una comunione",
  "Cresima": "una cresima",
  "Laurea": "una festa di laurea",
  "Anniversario": "un anniversario",
  "Baby Shower": "un baby shower",
  "Evento aziendale": "un evento",
};

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildEmailText({ eventType, guestCount, senderName }) {
  const label = EVENT_LABELS[eventType] || `un ${eventType?.toLowerCase() || "evento"}`;
  const guests = guestCount || "una trentina di";
  const name = senderName || "Gregorio";
  const intro = randomItem(INTRO_VARIANTS).replace("Gregorio", name);
  const closing = randomItem(CLOSING_VARIANTS);

  return `${intro}

Stavo cercando una location per festeggiare ${label} con circa ${guests} persone, e il vostro posto mi ha incuriosito.

Volevo sapere se è possibile affittare uno spazio per la serata e se si può portare catering esterno — avremmo già i nostri fornitori.

Per la data pensavo a qualcosa tra qualche mese, quindi c'è tempo per organizzare bene.

${closing}

${name}`;
}

// Crea transporter Gmail — viene riusato tra le chiamate
let transporter = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,   // mangionegregorio28@gmail.com
        pass: process.env.GMAIL_PASS,   // App Password Gmail (NON la tua password normale)
      },
    });
  }
  return transporter;
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }

  const { venueName, venueEmail, eventType, guestCount, senderName } = body;

  if (!venueEmail || !venueEmail.includes("@")) {
    return NextResponse.json({ error: "Email destinatario non valida" }, { status: 400 });
  }

  const emailText = buildEmailText({ eventType, guestCount, senderName });
  const subject = `Disponibilità sala per ${EVENT_LABELS[eventType] || "un evento"}`;
  const name = senderName || "Gregorio";

  console.log(`[send-email] Invio a: ${venueEmail} (${venueName}) — evento: ${eventType}`);

  try {
    const info = await getTransporter().sendMail({
      from: `${name} <${process.env.GMAIL_USER}>`,
      to: venueEmail,
      subject,
      text: emailText,
    });

    console.log(`[send-email] OK — messageId: ${info.messageId}`);
    return NextResponse.json({ success: true, messageId: info.messageId });

  } catch (e) {
    console.error("[send-email] Errore:", e.message);
    return NextResponse.json({ error: "Errore durante l'invio" }, { status: 500 });
  }
}