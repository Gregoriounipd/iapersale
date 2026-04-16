"use client";

// app/venue-finder/page.js

import { useState, useEffect, useRef } from "react";

// ─── Leaflet map component ────────────────────────────────────────────────────
function MapView({ venues }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.L) { setReady(true); return; }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || !venues?.length) return;
    const L = window.L;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const valid = venues.filter(v => v.lat && v.lng);
    if (!valid.length) return;

    const avgLat = valid.reduce((s, v) => s + v.lat, 0) / valid.length;
    const avgLng = valid.reduce((s, v) => s + v.lng, 0) / valid.length;

    const map = L.map(mapRef.current).setView([avgLat, avgLng], 12);
    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(map);

    valid.forEach((v) => {
      const color = scoreColor(v.score);
      const icon = L.divIcon({
        html: `<div style="width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:3px solid #0f0e0c;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.4);">
          <span style="transform:rotate(45deg);font-size:13px;font-weight:700;color:#0f0e0c;">${scoreIcon(v.score)}</span>
        </div>`,
        className: "",
        iconSize: [34, 34],
        iconAnchor: [17, 34],
        popupAnchor: [0, -36],
      });

      L.marker([v.lat, v.lng], { icon }).addTo(map).bindPopup(`
        <div style="font-family:Georgia,serif;min-width:200px;padding:4px;">
          <strong style="font-size:14px;">${v.name}</strong><br/>
          <span style="font-size:11px;color:#7a6a50;text-transform:uppercase;">${v.type}</span><br/>
          <span style="color:${color};font-weight:700;font-size:13px;">${v.score}/100 — ${scoreLabel(v.score)}</span>
          <p style="font-size:12px;color:#444;margin:6px 0 0;">${v.why}</p>
          ${v.phone ? `<div style="margin-top:6px;font-size:12px;">📞 <a href="tel:${v.phone}">${v.phone}</a></div>` : ""}
          ${v.website ? `<div style="font-size:12px;">🌐 <a href="${v.website}" target="_blank">Sito web</a></div>` : ""}
        </div>
      `, { maxWidth: 260 });
    });

    if (valid.length > 1) {
      map.fitBounds(L.latLngBounds(valid.map(v => [v.lat, v.lng])), { padding: [40, 40] });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [ready, venues]);

  return (
    <div
      ref={mapRef}
      style={{ width: "100%", height: "420px", borderRadius: "10px", border: "1px solid #2a2418" }}
    />
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const scoreColor = (s) => (s >= 80 ? "#4ade80" : s >= 55 ? "#fbbf24" : "#f87171");
const scoreLabel = (s) => (s >= 80 ? "Sala esclusiva" : s >= 55 ? "Da verificare" : "Catering obbligatorio");
const scoreIcon  = (s) => (s >= 80 ? "✓" : s >= 55 ? "?" : "✗");

const EVENT_TYPES = [
  "Compleanno", "Battesimo", "Comunione", "Cresima",
  "Laurea", "Anniversario", "Baby Shower", "Evento aziendale",
];

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function VenueFinderPage() {
  const [city, setCity]         = useState("");
  const [type, setType]         = useState("Compleanno");
  const [loading, setLoading]   = useState(false);
  const [results, setResults]   = useState(null);
  const [error, setError]       = useState(null);
  const [view, setView]         = useState("list");
  const [expanded, setExpanded] = useState(null);
  const [emailModal, setEmailModal] = useState(null);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState({});
  const [guestCount, setGuestCount] = useState("50");

  const sendEmail = async (venue) => {
    if (!venue.email) return;
    setEmailSending(true);
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueName: venue.name,
          venueEmail: venue.email,
          eventType: type,
          guestCount,
          senderName: "Greg",
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEmailSent(prev => ({ ...prev, [venue.name]: true }));
      setEmailModal(null);
    } catch (e) {
      alert("Errore invio email: " + e.message);
    } finally {
      setEmailSending(false);
    }
  };

  const search = async () => {
    if (!city.trim()) return;
    setLoading(true);
    setResults(null);
    setError(null);
    setExpanded(null);
    setView("list");

    try {
      const res = await fetch("/api/search-venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: city.trim(), type }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResults(data);
    } catch (e) {
      setError("Errore: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const sorted = results?.venues?.slice().sort((a, b) => b.score - a.score) || [];

  return (
    <div style={{ minHeight: "100vh", background: "#0f0e0c", fontFamily: "Georgia,'Times New Roman',serif", color: "#f0e6d0" }}>

      {/* Header */}
      <div style={{ borderBottom: "1px solid #2a2418", padding: "28px 32px 22px", background: "linear-gradient(180deg,#1a1408 0%,transparent 100%)" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <h1 style={{ margin: 0, fontSize: "26px", fontWeight: 400 }}>
            🏛️ Venue<span style={{ color: "#c9963e" }}>Finder</span>
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#5a4a30", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Solo spazi esclusivi · Catering libero · Tutta Italia
          </p>
        </div>
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 32px 80px" }}>

        {/* Legend */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
          {[
            ["#4ade80", "100–80", "Sala esclusiva · porta i tuoi servizi"],
            ["#fbbf24", "79–50",  "Da verificare telefonicamente"],
            ["#f87171", "49–0",   "Catering obbligatorio"],
          ].map(([c, range, label]) => (
            <div key={range} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#7a6a50", background: "#16140f", border: "1px solid #2a2418", borderRadius: "6px", padding: "5px 10px" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: c, display: "inline-block" }} />
              <strong style={{ color: c }}>{range}</strong> — {label}
            </div>
          ))}
        </div>

        {/* Search form */}
        <div style={{ background: "#16140f", border: "1px solid #2a2418", borderRadius: "12px", padding: "24px 28px", marginBottom: "28px" }}>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-end" }}>

            <div style={{ flex: 2, minWidth: "180px" }}>
              <label style={labelStyle}>Comune / Zona</label>
              <input
                value={city}
                onChange={e => setCity(e.target.value)}
                onKeyDown={e => e.key === "Enter" && search()}
                placeholder="es. Este, Monselice, Asolo, Soave..."
                style={inputStyle}
              />
              <div style={{ marginTop: 5, fontSize: "11px", color: "#3a3020" }}>
                Funziona con qualsiasi città italiana
              </div>
            </div>

            <div style={{ flex: 1, minWidth: "150px" }}>
              <label style={labelStyle}>Tipo evento</label>
              <select value={type} onChange={e => setType(e.target.value)} style={inputStyle}>
                {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>

            <button onClick={search} disabled={loading || !city.trim()} style={btnStyle(loading || !city.trim())}>
              {loading ? "⟳ Ricerca..." : "Cerca →"}
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "60px", color: "#5a4a30" }}>
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
            <div style={{ fontSize: "36px", animation: "spin 1.2s linear infinite", display: "inline-block", marginBottom: "14px" }}>⟳</div>
            <p style={{ margin: 0, fontSize: "13px" }}>L&apos;AI sta cercando location...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: "#2a0f0f", border: "1px solid #5a1f1f", borderRadius: "10px", padding: "14px 18px", color: "#f87171", fontSize: "13px", marginBottom: "20px" }}>
            ⚠️ {error}
          </div>
        )}

        {/* Results */}
        {results && !loading && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ fontSize: "13px", color: "#5a4a30" }}>
                <span style={{ color: "#c9963e", fontWeight: 600 }}>{sorted.length}</span> location a{" "}
                <strong style={{ color: "#f0e6d0" }}>{results.city}</strong>
                {" · "}
                <span style={{ color: "#4ade80" }}>{sorted.filter(v => v.score >= 80).length} sala esclusiva</span>
              </div>
              <div style={{ display: "flex", background: "#16140f", border: "1px solid #2a2418", borderRadius: "8px", overflow: "hidden" }}>
                {["list", "map"].map(v => (
                  <button key={v} onClick={() => setView(v)} style={{ background: view === v ? "#c9963e" : "transparent", border: "none", padding: "7px 18px", color: view === v ? "#0f0e0c" : "#5a4a30", fontSize: "12px", fontWeight: 700, fontFamily: "inherit", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {v === "list" ? "📋 Lista" : "🗺️ Mappa"}
                  </button>
                ))}
              </div>
            </div>

            {view === "map" && <MapView venues={sorted} />}

            {view === "list" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {sorted.map((venue, idx) => (
                  <div key={idx} onClick={() => setExpanded(expanded === idx ? null : idx)}
                    style={{ background: "#16140f", border: `1px solid ${expanded === idx ? "#3a2e18" : "#1e1c14"}`, borderLeft: `4px solid ${scoreColor(venue.score)}`, borderRadius: "10px", padding: "18px 22px", cursor: "pointer" }}>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: 3 }}>
                          <span style={{ fontSize: "15px", color: "#f0e6d0" }}>{venue.name}</span>
                          <span style={{ background: scoreColor(venue.score) + "22", color: scoreColor(venue.score), border: `1px solid ${scoreColor(venue.score)}55`, borderRadius: "999px", padding: "1px 10px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            {scoreLabel(venue.score)}
                          </span>
                        </div>
                        <span style={{ fontSize: "11px", color: "#3a3020", textTransform: "uppercase", letterSpacing: "0.06em" }}>{venue.type}</span>
                        {venue.address && <div style={{ marginTop: 4, fontSize: "12px", color: "#5a4a30" }}>📍 {venue.address}</div>}
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: "24px", color: scoreColor(venue.score), lineHeight: 1 }}>{venue.score}</div>
                        <div style={{ fontSize: "10px", color: "#3a3020", textTransform: "uppercase" }}>/100</div>
                      </div>
                    </div>

                    <p style={{ margin: "10px 0 0", fontSize: "13px", color: "#7a6a50", lineHeight: "1.5" }}>{venue.why}</p>

                    {expanded === idx && (
                      <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid #2a2418" }}>
                        {venue.signals?.length > 0 && (
                          <div style={{ marginBottom: "12px" }}>
                            <div style={{ fontSize: "10px", color: "#3a3020", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "7px" }}>Segnali rilevati</div>
                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                              {venue.signals.map((s, i) => (
                                <span key={i} style={{ background: "#1e1c14", border: "1px solid #2a2418", borderRadius: "999px", padding: "2px 10px", fontSize: "11px", color: "#7a6a50" }}>✓ {s}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "12px" }}>
                          {venue.phone   && <a href={`tel:${venue.phone}`} style={linkStyle}>📞 {venue.phone}</a>}
                          {venue.website && <a href={venue.website} target="_blank" rel="noopener noreferrer" style={linkStyle}>🌐 Sito web</a>}
                          {venue.lat && venue.lng && (
                            <a href={`https://www.google.com/maps/search/?api=1&query=${venue.lat},${venue.lng}`} target="_blank" rel="noopener noreferrer" style={linkStyle}>🗺️ Google Maps</a>
                          )}
                          {venue.email && (
                            emailSent[venue.name]
                              ? <span style={{ fontSize: "13px", color: "#4ade80" }}>✓ Email inviata</span>
                              : <button onClick={(e) => { e.stopPropagation(); setEmailModal(venue); }} style={{ background: "#c9963e22", border: "1px solid #c9963e55", borderRadius: "6px", padding: "3px 12px", color: "#c9963e", fontSize: "13px", fontFamily: "inherit", cursor: "pointer" }}>
                                  📧 Invia richiesta
                                </button>
                          )}
                        </div>
                        {venue.note && (
                          <div style={{ background: "#0f0e0c", border: "1px solid #2a2418", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: "#7a6a50", fontStyle: "italic" }}>
                            💡 {venue.note}
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ marginTop: "8px", fontSize: "10px", color: "#2a2418", textAlign: "right" }}>
                      {expanded === idx ? "▲ chiudi" : "▼ dettagli"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && !results && !error && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#2a2418" }}>
            <div style={{ fontSize: "52px", marginBottom: "14px" }}>🏡</div>
            <p style={{ margin: 0, fontSize: "13px", color: "#3a3020" }}>
              Scrivi qualsiasi città italiana...
            </p>
          </div>
        )}
      </div>

      {/* Email Modal */}
      {emailModal && (
        <div onClick={() => setEmailModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#16140f", border: "1px solid #2a2418", borderRadius: "12px", padding: "28px 32px", maxWidth: "480px", width: "100%" }}>
            <h3 style={{ margin: "0 0 6px", fontSize: "16px", fontWeight: 400, color: "#f0e6d0" }}>📧 Invia richiesta</h3>
            <p style={{ margin: "0 0 20px", fontSize: "12px", color: "#5a4a30" }}>{emailModal.name} · {emailModal.email}</p>
            
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "11px", color: "#5a4a30", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "6px" }}>Numero ospiti</label>
              <input
                value={guestCount}
                onChange={e => setGuestCount(e.target.value)}
                style={{ background: "#0f0e0c", border: "1px solid #2a2418", borderRadius: "6px", padding: "8px 12px", color: "#f0e6d0", fontSize: "14px", fontFamily: "inherit", outline: "none", width: "100px", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ background: "#0f0e0c", border: "1px solid #2a2418", borderRadius: "8px", padding: "14px 16px", fontSize: "12px", color: "#7a6a50", lineHeight: "1.6", marginBottom: "20px", fontStyle: "italic" }}>
              Gentili,<br/><br/>
              mi chiamo Gregorio e volevo richiedere informazioni.<br/>
              Sto cercando una location per un <strong style={{color:"#c9963e"}}>{type}</strong> con circa <strong style={{color:"#c9963e"}}>{guestCount} persone</strong>.<br/><br/>
              Vorrei sapere se è possibile affittare uno spazio esclusivo e se è consentito portare catering esterno o vi organizzate in maniera diversa.<br/><br/>
              Cordiali saluti,<br/>Gregorio – 
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button onClick={() => setEmailModal(null)} style={{ background: "transparent", border: "1px solid #2a2418", borderRadius: "6px", padding: "8px 18px", color: "#5a4a30", fontSize: "13px", fontFamily: "inherit", cursor: "pointer" }}>
                Annulla
              </button>
              <button onClick={() => sendEmail(emailModal)} disabled={emailSending} style={{ background: emailSending ? "#2a2418" : "linear-gradient(135deg,#c9963e,#a67a2e)", border: "none", borderRadius: "6px", padding: "8px 22px", color: emailSending ? "#5a4a30" : "#0f0e0c", fontSize: "13px", fontWeight: 700, fontFamily: "inherit", cursor: emailSending ? "not-allowed" : "pointer" }}>
                {emailSending ? "Invio..." : "Invia →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Style helpers ────────────────────────────────────────────────────────────
const labelStyle = {
  display: "block", fontSize: "11px", color: "#5a4a30",
  letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "7px",
};
const inputStyle = {
  width: "100%", background: "#0f0e0c", border: "1px solid #2a2418",
  borderRadius: "8px", padding: "10px 14px", color: "#f0e6d0",
  fontSize: "14px", fontFamily: "inherit", outline: "none", boxSizing: "border-box",
};
const btnStyle = (disabled) => ({
  background: disabled ? "#2a2418" : "linear-gradient(135deg,#c9963e,#a67a2e)",
  border: "none", borderRadius: "8px", padding: "10px 26px",
  color: disabled ? "#5a4a30" : "#0f0e0c", fontSize: "14px", fontWeight: 700,
  fontFamily: "inherit", cursor: disabled ? "not-allowed" : "pointer",
  height: "42px", whiteSpace: "nowrap",
});
const linkStyle = { fontSize: "13px", color: "#c9963e", textDecoration: "none" };