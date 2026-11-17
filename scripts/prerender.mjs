// Build-time prerender of the public pages (run after `vite build` and
// `vite build --ssr src/public/entry-server.jsx --outDir dist-ssr`).
//   dist/index.html            app shell for "/" (dashboard or login), INDEXED:
//                              search title/description, Open Graph, JSON-LD
//   dist/robots.txt, dist/sitemap.xml   ("/" + the public pages)
//   dist/<slug>.html           each public page (served at /<slug> by cleanUrls)
//   dist/404.html              real 404 page for unknown URLs
//   dist/app.html              empty app shell, noindex (app routes rewrite here)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const ssr = path.join(root, "dist-ssr", "entry-server.js");

const { render, PUBLIC_ROUTES, NOT_FOUND, SITE_URL, PRODUCT, HOME_TITLE, HOME_DESCRIPTION, LAST_UPDATED } =
  await import(pathToFileURL(ssr).href);

// Every app route in App.jsx must be rewritten to the app shell by vercel.json,
// otherwise it would be a 404 in production. Fail the build if one is missing.
{
  const app = fs.readFileSync(path.join(root, "src", "App.jsx"), "utf8");
  const rewrites = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8")).rewrites || [];
  const toRe = (src) => new RegExp("^" + src.replace(/:(\w+)\*/g, ".*").replace(/:(\w+)/g, "[^/]+") + "$");
  const res = rewrites.filter((r) => r.destination === "/app.html").map((r) => toRe(r.source));
  const publicPaths = new Set(PUBLIC_ROUTES.map((r) => r.path));
  const missing = [...app.matchAll(/path="([^"]+)"/g)].map((m) => m[1])
    .filter((p) => !publicPaths.has(p) && p !== "*" && p !== "/")   // "/" is dist/index.html, the app shell
    .map((p) => p.replace(/:\w+/g, "x1"))
    .filter((p) => !res.some((re) => re.test(p)));
  if (missing.length) {
    console.error(`vercel.json does not rewrite these app routes to /app.html:\n  ${missing.join("\n  ")}`);
    process.exit(1);
  }
}
const template = fs.readFileSync(path.join(dist, "index.html"), "utf8");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function page(route, { body = "", noindex = false, canonical = true, marker = "", extra = [] } = {}) {
  const head = [
    `<title>${esc(route.title)}</title>`,
    `<meta name="description" content="${esc(route.description)}" />`,
    canonical ? `<link rel="canonical" href="${SITE_URL}${route.path === "/" ? "/" : route.path}" />` : "",
    noindex ? `<meta name="robots" content="noindex, nofollow" />` : "",
    // link previews (WhatsApp, LinkedIn, X) for every indexed page
    ...(noindex ? [] : [
      `<meta property="og:type" content="website" />`,
      `<meta property="og:site_name" content="${esc(PRODUCT)}" />`,
      `<meta property="og:title" content="${esc(route.title)}" />`,
      `<meta property="og:description" content="${esc(route.description)}" />`,
      `<meta property="og:url" content="${SITE_URL}${route.path}" />`,
      `<meta property="og:image" content="${SITE_URL}/brand/og-image.png" />`,
      `<meta property="og:image:width" content="1200" />`,
      `<meta property="og:image:height" content="630" />`,
      `<meta property="og:image:alt" content="Sphere Design Hub logo" />`,
      `<meta property="og:locale" content="en_GB" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="${esc(route.title)}" />`,
      `<meta name="twitter:description" content="${esc(route.description)}" />`,
      `<meta name="twitter:image" content="${SITE_URL}/brand/og-image.png" />`,
    ]),
    ...extra,
  ].filter(Boolean).join("\n    ");
  let html = template.replace(/<title>[\s\S]*?<\/title>/, head);
  if (marker) html = html.replace(/<html lang="en"/, `<html lang="en" data-page="${marker}"`);
  return html.replace('<div id="root"></div>', `<div id="root">${body}</div>`);
}

const write = (file, html) => {
  fs.mkdirSync(path.dirname(path.join(dist, file)), { recursive: true });
  fs.writeFileSync(path.join(dist, file), html);
};

// app.html: the app shell app routes rewrite to (login, dashboard, ...), never indexed
write("app.html", page({ title: PRODUCT, description: `${PRODUCT} app.` }, { noindex: true, canonical: false }));

// index.html: "/" (dashboard, or the sign-in page when signed out). This is the
// page search engines and link previews read for the site itself; the tags
// below are in the head only, nothing extra is shown on screen.
const home = { path: "/", title: HOME_TITLE, description: HOME_DESCRIPTION };
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: PRODUCT,
  url: `${SITE_URL}/`,
  description: HOME_DESCRIPTION,
  applicationCategory: "EngineeringApplication",
  operatingSystem: "Any (web browser)",
  inLanguage: "en",
};
write("index.html", page(home, {
  extra: [
    `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
  ],
}));

// robots.txt + sitemap.xml: "/" and the public pages. App routes are not listed
// (they are noindex); they are not blocked either, so crawlers can see the noindex.
write("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
const lastmod = new Date(`${LAST_UPDATED} UTC`).toISOString().slice(0, 10);
const urls = ["/", ...PUBLIC_ROUTES.map((r) => r.path)];
write("sitemap.xml", [
  `<?xml version="1.0" encoding="UTF-8"?>`,
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
  ...urls.map((u) => `  <url><loc>${SITE_URL}${u}</loc><lastmod>${lastmod}</lastmod></url>`),
  `</urlset>`,
  ``,
].join("\n"));

for (const r of PUBLIC_ROUTES) {
  write(`${r.path.slice(1)}.html`, page(r, { body: render(r.path) }));
}
write("404.html", page(NOT_FOUND, { body: render(NOT_FOUND.path), noindex: true, canonical: false, marker: "404" }));

fs.rmSync(path.join(root, "dist-ssr"), { recursive: true, force: true });
console.log(`prerendered ${PUBLIC_ROUTES.length} public pages + 404 + app shell + robots/sitemap (site ${SITE_URL})`);
