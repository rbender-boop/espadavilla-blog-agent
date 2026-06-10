/**
 * blog-images.ts — per-post hero image selection for agent-published posts.
 *
 * Problem this solves: every generated post shipped the SAME /images/hero-1.jpg
 * as og:image AND the BlogPosting image — killing Discover eligibility, image
 * search, and social-card differentiation. This maps each topic CLUSTER to a
 * pool of REAL images already in espadavilla-com/images (verified present +
 * dimensions measured 2026-06-09), and picks one deterministically by slug so a
 * given post — and its refreshes — always resolve to the SAME image (stable
 * og:image, no surprise churn).
 *
 * All dimensions are the true intrinsic sizes (measured from the live files) so
 * render-post can emit a Google-preferred ImageObject with width/height. Every
 * image here is landscape and >=1200px wide (Discover's minimum).
 */

import { SITE_ORIGIN } from '../links';

export type BlogImage = { path: string; width: number; height: number; alt: string };

/** Cluster slug → ordered pool of candidate images (real files in the site repo). */
const IMAGES_BY_CLUSTER: Record<string, BlogImage[]> = {
  stay: [
    { path: '/images/villa-espada-great-room-vaulted-ceiling.jpg', width: 2000, height: 1335, alt: 'Villa Espada great room with vaulted ceiling, Cap Cana' },
    { path: '/images/villa-espada-pool-villa.jpg', width: 1248, height: 832, alt: 'Villa Espada private pool, Cap Cana' },
    { path: '/images/villa-espada-outdoor-lounge.jpg', width: 1600, height: 902, alt: 'Villa Espada outdoor lounge overlooking Punta Espada' },
    { path: '/images/villa-espada-exterior-front.jpg', width: 1600, height: 774, alt: 'Villa Espada exterior on Fairway 5, Punta Espada' },
  ],
  group_occasion: [
    { path: '/images/villa-espada-great-room-vaulted-ceiling.jpg', width: 2000, height: 1335, alt: 'Villa Espada great room set for a group gathering' },
    { path: '/images/villa-espada-game-room.jpg', width: 1280, height: 612, alt: 'Villa Espada game room' },
    { path: '/images/villa-espada-outdoor-lounge.jpg', width: 1600, height: 902, alt: 'Villa Espada outdoor lounge for groups' },
    { path: '/images/villa-espada-aerial-fairway-5-punta-espada.jpg', width: 2000, height: 1125, alt: 'Aerial of Villa Espada on Fairway 5, Punta Espada' },
  ],
  golf: [
    { path: '/images/Punta_Espada_Golf_Course_3-OK.webp', width: 2048, height: 1396, alt: 'Punta Espada Golf Course, Cap Cana' },
    { path: '/images/punta-course-2.webp', width: 2000, height: 1493, alt: 'Punta Espada fairway over the Caribbean Sea' },
    { path: '/images/puntaespada3.avif', width: 1280, height: 720, alt: 'Punta Espada signature oceanside hole' },
    { path: '/images/lasiguanas1.jpg', width: 1024, height: 768, alt: 'Las Iguanas Golf Course, Cap Cana' },
    { path: '/images/lacana1.jpg', width: 1920, height: 1440, alt: 'La Cana Golf Course, Punta Cana' },
    { path: '/images/Corales1.jpg', width: 669, height: 446, alt: 'Corales Golf Course, Puntacana' },
  ],
  experience: [
    { path: '/images/09_Eden_Roc_aerial_3.jpg', width: 1920, height: 1080, alt: 'Eden Roc Beach Club aerial, Cap Cana' },
    { path: '/images/05_Juanillo_aerial_4.jpeg', width: 1200, height: 900, alt: 'Juanillo Beach, Cap Cana' },
    { path: '/images/ScapePark1.jpg', width: 1200, height: 800, alt: 'Scape Park, Cap Cana' },
    { path: '/images/10_Fishing_Village_aerial_2.jpg', width: 3072, height: 2304, alt: 'Cap Cana Fishing Village and Marina aerial' },
    { path: '/images/11_Establos_aerial_1.jpg', width: 1220, height: 800, alt: 'Los Establos Equestrian Center, Cap Cana' },
    { path: '/images/rafanadaltenniscenter.jpg', width: 2000, height: 1125, alt: 'Rafa Nadal Tennis Center near Cap Cana' },
    { path: '/images/El-Dorado-Park-Artificial-Beach-at-Cap-Cana.jpg', width: 2000, height: 1333, alt: 'El Dorado Park beach, Cap Cana' },
  ],
  dining: [
    { path: '/images/08_St_Regis_aerial_5.jpg', width: 1200, height: 675, alt: 'St. Regis Cap Cana aerial' },
    { path: '/images/09_Eden_Roc_aerial_3.jpg', width: 1920, height: 1080, alt: 'Eden Roc Cap Cana dining and beach club' },
  ],
  logistics: [
    { path: '/images/01_Cap_Cana_aerial_1.webp', width: 1200, height: 675, alt: 'Cap Cana aerial overview, Dominican Republic' },
    { path: '/images/02_Farallon_aerial_1.jpg', width: 1200, height: 800, alt: 'Farallón cliffs, Cap Cana' },
  ],
  comparison: [
    { path: '/images/01_Cap_Cana_aerial_1.webp', width: 1200, height: 675, alt: 'Cap Cana aerial overview for destination comparison' },
    { path: '/images/villa-espada-aerial-fairway-5-punta-espada.jpg', width: 2000, height: 1125, alt: 'Villa Espada on Fairway 5, Punta Espada' },
  ],
};

/** Safe default when a cluster is unknown or has no pool. */
const DEFAULT_IMAGE: BlogImage = {
  path: '/images/villa-espada-aerial-fairway-5-punta-espada.jpg',
  width: 2000,
  height: 1125,
  alt: 'Villa Espada on Fairway 5 of Punta Espada Golf Course, Cap Cana',
};

/** Tiny stable string hash (djb2) → non-negative int. Deterministic across runs. */
function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Pick a hero image for a post. Deterministic by slug within the cluster pool,
 * so the same post (and any refresh of it) always resolves to the same image.
 * Returns an absolute-URL image plus intrinsic dimensions and alt text.
 */
export function pickPostImage(slug: string, cluster: string | null | undefined): {
  url: string;
  width: number;
  height: number;
  alt: string;
} {
  const pool = (cluster && IMAGES_BY_CLUSTER[cluster]) || [];
  const img = pool.length ? pool[hashString(slug) % pool.length]! : DEFAULT_IMAGE;
  return { url: `${SITE_ORIGIN}${img.path}`, width: img.width, height: img.height, alt: img.alt };
}
