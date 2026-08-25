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
export const AW_ID = 'AW-18275005017';

/** GTM <head> snippet — Google Ads gtag first, then GTM (mirrors live pages). */
export function gtmHead(): string {
  return `<!-- Google tag (gtag.js) - Google Ads ${AW_ID} -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${AW_ID}"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${AW_ID}');
</script>
<!-- Google Tag Manager -->
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
  <a href="/" class="nav-logo"><span class="logo-top">Villa Espada</span><span class="logo-sub">Cap Cana · Dominican Republic</span></a>
  <ul class="nav-links">
    <li><a href="/villa">The Villa</a></li>
    <li><a href="/golf">Golf</a></li>
    <li><a href="/amenities">Amenities</a></li>
    <li><a href="/experiences">Experiences</a></li>
    <li><a href="/gallery">Gallery</a></li>
    <li><a href="/rates">Rates</a></li>
    <li><a href="/map">Map</a></li>
    <li><a href="/blog">Blog</a></li>
    <li><a href="/contact" class="nav-book-btn">Book Now</a></li>
  </ul>
  <button class="nav-hamburger"><span></span><span></span><span></span></button>
</nav>`;
}

/** Mobile slide-out menu — verbatim from the live espadavilla.com template. */
export function mobileMenu(): string {
  return `<div class="mobile-menu"><button class="mobile-close">×</button>
  <a href="/">Home</a>
  <a href="/villa">The Villa</a><a href="/golf">Golf</a>
  <a href="/amenities">Amenities</a><a href="/experiences">Experiences</a>
  <a href="/gallery">Gallery</a><a href="/rates">Rates</a>
  <a href="/map">Map</a><a href="/blog">Blog</a>
  <a href="/contact">Book Now</a></div>`;
}

/** Site footer — verbatim from the live espadavilla.com template. */
export function siteFooter(): string {
  return `<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-brand"><span class="logo-top">Villa Espada</span><span class="logo-sub">Cap Cana · Dominican Republic</span><p>6- or 8-bedroom luxury villa on Fairway 5 of Punta Espada Golf Course. Full staff. Member-guest discounted rate. Two golf carts.</p></div>
      <div class="footer-col"><h4>Villa</h4><ul><li><a href="/villa">The Villa</a></li><li><a href="/golf">Golf</a></li><li><a href="/amenities">Amenities</a></li></ul></div>
      <div class="footer-col"><h4>Book</h4><ul><li><a href="/rates">Rates</a></li><li><a href="/contact">Contact</a></li><li><a href="/faq">FAQ</a></li><li><a href="/property-facts">Property Facts</a></li><li><a href="/about">About the Authors</a></li></ul></div>
      <div class="footer-col"><h4>Contact</h4><ul><li><a href="/contact">Contact Us</a></li></ul></div>
    </div>
    <div class="footer-bottom"><p>© 2026 Villa Espada · espadavilla.com</p><p><span class="gold">Direct:</span> <a href="/contact" style="color:inherit;text-decoration:none;">Book direct</a></p></div>
  </div>
</footer>
<a href="/contact" class="float-book">Book Now</a>`;
}
