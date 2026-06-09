/**
 * site-chrome.ts — SINGLE SOURCE OF TRUTH for the espadavilla.com shared chrome
 * (Google Tag Manager, primary nav, mobile menu, footer) used by every
 * agent-generated page: blog posts (render-post.ts) and the /blog index
 * (update-index.ts).
 *
 * Mirrors the LIVE espadavilla.com template verbatim (see any existing
 * blog/<slug>.html in rbender-boop/espadavilla-com), so generated pages are
 * visually identical to the hand-built posts: same nav, footer, GTM container,
 * and Villa Espada branding. There is no "network bar" on espadavilla — the nav
 * follows the GTM noscript directly.
 */

export const GTM_ID = 'GTM-PMPSNQZT';

/** GTM <head> snippet. */
export function gtmHead(): string {
  return `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');</script>
<!-- End Google Tag Manager -->`;
}

/** GTM <noscript> immediately after <body>. */
export function gtmBodyNoscript(): string {
  return `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_ID}"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`;
}

/**
 * Espadavilla has no featured-villa network bar (the villa IS the site). Kept as
 * an exported no-op so render-post.ts / update-index.ts callers stay unchanged.
 */
export function networkBar(): string {
  return '';
}

/** Primary site nav (desktop) — verbatim from the live espadavilla.com template. */
export function siteNav(): string {
  return `<nav class="site-nav scrolled" id="main-nav">
  <a href="/index.html" class="nav-logo"><span class="logo-top">Villa Espada</span><span class="logo-sub">Cap Cana · Dominican Republic</span></a>
  <ul class="nav-links">
    <li><a href="/villa.html">The Villa</a></li>
    <li><a href="/golf.html">Golf</a></li>
    <li><a href="/amenities.html">Amenities</a></li>
    <li><a href="/experiences.html">Experiences</a></li>
    <li><a href="/gallery.html">Gallery</a></li>
    <li><a href="/rates.html">Rates</a></li>
    <li><a href="/blog">Blog</a></li>
    <li><a href="/contact.html" class="nav-book-btn">Book Now</a></li>
  </ul>
  <button class="nav-hamburger"><span></span><span></span><span></span></button>
</nav>`;
}

/** Mobile slide-out menu — verbatim from the live espadavilla.com template. */
export function mobileMenu(): string {
  return `<div class="mobile-menu"><button class="mobile-close">×</button>
  <a href="/villa.html">The Villa</a><a href="/golf.html">Golf</a>
  <a href="/amenities.html">Amenities</a><a href="/experiences.html">Experiences</a>
  <a href="/gallery.html">Gallery</a><a href="/rates.html">Rates</a>
  <a href="/contact.html">Book Now</a>
  <a href="/blog">Blog</a></div>`;
}

/** Site footer — verbatim from the live espadavilla.com template. */
export function siteFooter(): string {
  return `<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-brand"><span class="logo-top">Villa Espada</span><span class="logo-sub">Cap Cana · Dominican Republic</span><p>8-bedroom luxury villa on Fairway 5 of Punta Espada Golf Course. Full staff. Member rates. Two golf carts.</p></div>
      <div class="footer-col"><h4>Villa</h4><ul><li><a href="/villa.html">The Villa</a></li><li><a href="/golf.html">Golf</a></li><li><a href="/amenities.html">Amenities</a></li></ul></div>
      <div class="footer-col"><h4>Book</h4><ul><li><a href="/rates.html">Rates</a></li><li><a href="/contact.html">Contact</a></li><li><a href="/faq.html">FAQ</a></li><li><a href="/property-facts">Property Facts</a></li></ul></div>
      <div class="footer-col"><h4>Contact</h4><ul><li><a href="mailto:reservations@espadavilla.com">Email Us</a></li></ul></div>
    </div>
    <div class="footer-bottom"><p>© 2026 Villa Espada · espadavilla.com</p><p><span class="gold">Direct:</span> reservations@espadavilla.com</p></div>
  </div>
</footer>
<a href="/contact.html" class="float-book">Book Now</a>`;
}
