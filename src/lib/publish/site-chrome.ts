/**
 * site-chrome.ts — SINGLE SOURCE OF TRUTH for the golfvilla.com shared chrome
 * (Google Tag Manager, network bar, primary nav, mobile menu, footer) used by
 * every agent-generated page: blog posts (render-post.ts) and the /blog index
 * (update-index.ts).
 *
 * WHY THIS EXISTS (audit fix #3): the chrome used to be hardcoded separately in
 * render-post.ts and update-index.ts. The two copies drifted from each other
 * AND from the live site (the live nav gained a /blog link; the generated copies
 * did not). Centralising here guarantees the two generated surfaces stay
 * identical to each other and gives exactly ONE place to update when the live
 * template changes. Mirrors the live template verbatim
 * (golfvilla-com/golf-villa-facts/index.html), including the /blog nav link.
 */

export const GTM_ID = 'GTM-N59QFL4G';

/** GTM <head> snippet. */
export function gtmHead(): string {
  return `  <!-- Google Tag Manager -->
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

/** Featured-villa network bar. */
export function networkBar(): string {
  return `<!-- NETWORK BAR -->
<div class="network-bar">
  <p>Featured Villa: <a href="https://www.espadavilla.com">Villa Espada · Punta Espada Fairway 5 · Cap Cana, Dominican Republic</a> — Member tee times included</p>
</div>`;
}

/** Primary site nav (desktop). Includes the /blog link — matches live site. */
export function siteNav(): string {
  return `<nav class="site-nav" id="main-nav">
  <a href="/" class="nav-logo">
    <span class="logo-top">Golf Villa</span>
    <span class="logo-sub">The World's Premier Golf Villa</span>
  </a>
  <ul class="nav-links">
    <li><a href="/what-is-a-golf-villa/">What is a Golf Villa?</a></li>
    <li class="nav-dropdown">
      <a href="/caribbean-golf-villa/">Destinations ▾</a>
      <ul class="nav-sub">
        <li><a href="/caribbean-golf-villa/">Caribbean Golf Villas</a></li>
        <li><a href="/cap-cana-golf-villa/" class="nav-featured">Cap Cana Golf Villa ★</a></li>
        <li><a href="/dominican-republic-golf-villa/">Dominican Republic</a></li>
        <li><a href="/luxury-golf-villa/">All Luxury Villas</a></li>
      </ul>
    </li>
    <li class="nav-dropdown">
      <a href="/golf-villa-rental/">Golf Trips ▾</a>
      <ul class="nav-sub">
        <li><a href="/golf-bachelor-party-villa/">Golf Bachelor Party</a></li>
        <li><a href="/corporate-golf-villa-retreat/">Corporate Golf Retreat</a></li>
        <li><a href="/annual-golf-trip-villa/">Annual Golf Trips</a></li>
        <li><a href="/golf-villa-rental/">Golf Villa Rental Guide</a></li>
      </ul>
    </li>
    <li><a href="/golf-villa-packages/">Packages</a></li>
    <li><a href="/blog">Blog</a></li>
    <li><a href="/book/" class="nav-book-btn">Book Now</a></li>
  </ul>
  <button class="nav-hamburger" aria-label="Menu"><span></span><span></span><span></span></button>
</nav>`;
}

/** Mobile slide-out menu. Includes the /blog link — matches live site. */
export function mobileMenu(): string {
  return `<div class="mobile-menu" id="mobile-menu">
  <button class="mobile-close" id="mobile-close">×</button>
  <a href="/">Home</a>
  <a href="/blog">Blog</a>
  <a href="/what-is-a-golf-villa/">What is a Golf Villa?</a>
  <a href="/caribbean-golf-villa/">Caribbean Golf Villas</a>
  <a href="/cap-cana-golf-villa/">Cap Cana Golf Villa</a>
  <a href="/dominican-republic-golf-villa/">Dominican Republic</a>
  <a href="/luxury-golf-villa/">Luxury Golf Villas</a>
  <a href="/golf-villa-rental/">Golf Villa Rentals</a>
  <a href="/golf-villa-packages/">Packages</a>
  <a href="/book/">Book Now</a>
  <a href="https://www.espadavilla.com">Villa Espada →</a>
</div>`;
}

/** Site footer (full four-column) — matches live site. */
export function siteFooter(): string {
  return `<footer class="site-footer">
  <div class="footer-inner">
    <div class="footer-brand">
      <span class="logo-top">Golf Villa</span>
      <span class="logo-sub">The World's Premier Golf Villa</span>
      <p>GolfVilla.com is the authoritative guide to private golf villa rentals worldwide — and home to Villa Espada at Cap Cana, the world's finest golf villa.</p>
      <div class="footer-contact">
        <p><strong>Rob Bender, Owner</strong></p>
        <p><a href="mailto:rob@golfvilla.com">rob@golfvilla.com</a></p>
        <p><a href="tel:+17347556357">+1 (734) 755-6357</a></p>
      </div>
    </div>
    <div class="footer-col">
      <h4>Golf Villa Guides</h4>
      <ul>
        <li><a href="/golf-villa-facts/">Golf Villa Facts</a></li>
        <li><a href="/golf-villa-faq/">Golf Villa FAQ</a></li>
        <li><a href="/what-is-a-golf-villa/">What Is a Golf Villa?</a></li>
        <li><a href="/luxury-golf-villa/">Luxury Golf Villa</a></li>
        <li><a href="/golf-villa-rental/">Golf Villa Rental Guide</a></li>
        <li><a href="/golf-villa-packages/">Golf Villa Packages</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h4>Golf Villa Destinations</h4>
      <ul>
        <li><a href="/caribbean-golf-villa/">Caribbean Golf Villas</a></li>
        <li><a href="/cap-cana-golf-villa/">Cap Cana Golf Villa</a></li>
        <li><a href="/dominican-republic-golf-villa/">Dominican Republic</a></li>
        <li><a href="/golf-villa-scotland/">Scotland Golf Villas</a></li>
        <li><a href="/golf-villa-ireland/">Ireland Golf Villas</a></li>
        <li><a href="/golf-villa-portugal/">Portugal Golf Villas</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h4>Golf Network</h4>
      <ul>
        <li><a href="https://www.espadavilla.com/">Villa Espada — Book Direct</a></li>
        <li><a href="https://www.golfcapcana.com/">Golf in Cap Cana</a></li>
        <li><a href="https://www.caribbeangolfcourse.com/">Caribbean Golf Courses</a></li>
        <li><a href="https://www.golflasiguanas.com/">Las Iguanas Golf Course</a></li>
      </ul>
    </div>
  </div>
  <div class="footer-bottom">
    <p>&copy; 2026 GolfVilla.com — The World's Premier Golf Villa Authority</p>
    <p>Featured property: <a href="https://www.espadavilla.com">espadavilla.com</a> · Cap Cana, Dominican Republic · Contact: <a href="mailto:rob@golfvilla.com">rob@golfvilla.com</a></p>
  </div>
</footer>`;
}
