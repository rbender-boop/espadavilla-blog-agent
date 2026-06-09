export default function RootPage() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '3rem', maxWidth: 640 }}>
      <h1 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>GolfVilla Blog Agent</h1>
      <p style={{ color: '#555', lineHeight: 1.6 }}>
        Autonomous weekly SEO blog agent for golfvilla.com. Drafts a post, sends it to
        Rob on WhatsApp for approval, and on &ldquo;yes&rdquo; commits the rendered post
        to <code>rbender-boop/golfvilla-com</code> main.
      </p>
      <p style={{ color: '#888', fontSize: '0.85rem', marginTop: '2rem' }}>
        Health: <a href="/api/health">/api/health</a>
      </p>
    </main>
  );
}
