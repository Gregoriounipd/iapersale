// app/layout.js

export const metadata = {
  title: {
    default: "VenueFinder Veneto",
    template: "%s · VenueFinder Veneto",
  },
  description: "Trova location esclusive per eventi in Veneto. Spazi senza catering obbligatorio per event planner professionisti.",
  keywords: ["location eventi veneto", "sale per compleanni veneto", "spazi esclusivi eventi", "event planner veneto"],
  authors: [{ name: "Greg4Web", url: "https://greg4web.it" }],
  openGraph: {
    title: "VenueFinder Veneto",
    description: "Trova location esclusive per eventi in Veneto.",
    locale: "it_IT",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=Source+Sans+3:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{
        margin: 0,
        padding: 0,
        background: "#0f0e0c",
        fontFamily: "'Source Sans 3', Georgia, serif",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
      }}>
        {children}
      </body>
    </html>
  );
}