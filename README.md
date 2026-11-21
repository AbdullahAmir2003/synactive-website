# Synactive

The Synactive website is a static HTML, CSS, and JavaScript site. It has no package manager, framework, or build step. The service catalog is organized into four service lines:

- Red Teaming (7 services)
- Governance, Risk and Compliance (7 services)
- Blue Teaming (1 service)
- Cybersecurity Consulting (1 service)

## Local preview

From the repository root, start a local static server:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`. The site can also be opened with a static hosting provider.

## Main routes

- `index.html` — homepage and full expandable service catalog
- `services.html` — legacy route to the homepage service catalog
- `process.html` — the four stage engagement process
- `about.html` and `contact.html` — company and contact information

The four service line sections and all 16 service dropdowns appear together on the homepage. Each line spans the page with its own animated background, without an outer card. Legacy standalone service URLs redirect to their matching service cards on `index.html`, while blog and article URLs redirect to the homepage. The contact forms submit to the existing Formspree endpoint.

## Shared assets

- `assets/style.css` — shared responsive design system and legacy page styling
- `assets/site.js` — accessible mobile navigation, service-interest preselection, card spotlights, and animated service disclosures
- `synactive-logo.png` — site logo

## React component setup

This repository is currently plain HTML, CSS, and JavaScript. It does not have React, TypeScript, Tailwind CSS, or a shadcn build pipeline, so the supplied TSX `GlowCard` is saved at `components/ui/spotlight-card.tsx` but is not compiled by the website. The service cards use a lightweight native pointer spotlight instead. No image, icon, context provider, or state management dependency is required for the card.

The current site uses `components/ui` for the supplied component and `assets/style.css` for shared styles. A Vite and shadcn project often uses `src/components/ui` and `src/index.css`; keep the CLI aliases and import paths aligned with whichever layout is selected.

To create a Vite React and TypeScript workspace with shadcn support:

```sh
npm create vite@latest synactive-ui -- --template react-ts
cd synactive-ui
npm install
npm install -D tailwindcss @tailwindcss/vite
npx shadcn@latest init
```

In the shadcn setup, configure the component alias to match where the files live. The conventional `components/ui` folder keeps reusable primitives together and makes imports such as `@/components/ui/spotlight-card` predictable. If the project uses Vite's `src` directory alias, place the component at `src/components/ui/spotlight-card.tsx` or point the alias at the repository root. Add `tailwindcss()` from `@tailwindcss/vite` to the Vite plugins and `@import "tailwindcss";` to the app stylesheet before using the component's utility classes.

The card accepts children, class name, glow color, size, width, height, and a custom size option. It has no provider or external asset requirements. For the service catalog, use custom sizing so cards follow the responsive grid width.

No build or automated test runner is currently configured for the existing static site. Before publishing, verify page routes and local links, preview the responsive layout, and test the Formspree submission flow.

## Contact

- Email: [team@synactive.co](mailto:team@synactive.co)
- Location: Remote
- Website: [synactive.co](https://synactive.co)
- [Synactive on LinkedIn](https://www.linkedin.com/company/synactive-co/)
