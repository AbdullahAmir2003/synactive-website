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

- `index.html` — homepage
- `services.html` — complete service directory
- `security-testing.html` — Red Teaming service line
- `compliance-governance.html` — Governance, Risk and Compliance service line
- `blue-teaming.html` — Blue Teaming service line
- `cybersecurity-consulting.html` — Cybersecurity Consulting service line
- `about.html`, `contact.html`, and `blog.html` — company, contact, and insights
- `posts/*.html` — published articles

Existing service URLs such as `penetration-testing.html`, `iso-27001.html`, and `llm-security-assessment.html` remain available as compatibility pages that link to the current service details. The contact forms submit to the existing Formspree endpoint.

## Shared assets

- `assets/style.css` — shared responsive design system and legacy page styling
- `assets/site.js` — accessible mobile navigation and service-interest preselection
- `synactive-logo.png` — site logo

No build or automated test runner is currently configured. Before publishing, verify page routes and local links, preview the responsive layout, and test the Formspree submission flow.

## Contact

- Email: [team@synactive.co](mailto:team@synactive.co)
- Location: Islamabad, Pakistan
- Website: [synactive.co](https://synactive.co)
- [Synactive on LinkedIn](https://www.linkedin.com/company/synactive-co/)
