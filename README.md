# EG TECH

Editorial company website for Empowering Growth Technology. Built with Vite and native HTML, CSS and JavaScript. Outfit and JetBrains Mono are self-hosted. The official supplied logo is preserved; the decorative chrome sculpture and WebGL dependencies have been removed.

## Run

Use Node.js 22.12+ or a supported newer LTS version.

```
npm install
npm run dev
npm test
npm run build
npm run preview
```

Deploy the generated dist folder to a static host.

## Narrative sections

- #services — 02 / Services & Capabilities
- #work — 03 / Selected Work & Case Studies
- #visibility — 04 / Search Infrastructure & Performance
- #process — 05 / Engineering Methodology
- #about — 06 / Studio Profile
- #feedback — 07 / Studio Standards & Verified Impact
- #philosophy — 08 / Studio Manifesto
- #brief — 09 / Project Briefing

The hero uses an original lightweight systems diagram. The requested reference, https://www.tranzora.digital/, informed the light editorial style, blue accents and section rhythm; no reference branding or assets are included.

## Loading animation

The official logo has a depth reveal, orbital lines and a curtain exit. It runs only at document startup and valid brief preparation. Startup lasts approximately 2.3 seconds, with a 2.7-second fail-open deadline; keyboard or pointer interaction dismisses it early. Reduced-motion startup is near-immediate. Brief preparation uses a short 850ms transition, skipped for reduced motion. No upload or network progress is simulated.

## Brief configuration

Copy .env.example to .env.local and set VITE_CONTACT_EMAIL to the real public business email, then rebuild. This is a public value, not a secret. Without it, visitors can prepare and download a text brief. With it, visitors can open an email draft and review/send through their own email application. There is no backend submission, analytics or saved form data.

## Project evidence

The user identified Tiruttani Quick and BidVerify AI as portfolio projects. The supplied Tiruttani Quick URL resolves to a live grocery-delivery website, with catalog and customer-app links. Its case study links to that site. BidVerify AI has no supplied public URL. Tiruttani Quick uses a locally stored screenshot of its actual storefront, linked to the live website. BidVerify AI uses identity artwork. Detailed delivery evidence and measured commercial outcomes remain unpublished; do not add unsupported results.

The sub-50ms TTFB figure is explicitly an engineering target for suitable cached edge responses, not a measured site result or guarantee. Validate against the actual hosting, routes, regions and traffic before publishing any achieved figure.

## Validation and launch

Eight automated tests cover briefs, safe email encoding, fragment links, section order, sculpture removal and organization metadata. The production build passes. Browser verification confirmed the repaired manifesto heading, its scroll re-entry, and the actual Tiruttani Quick storefront preview, with no console warnings or errors. Earlier Lighthouse reports predate this redesign and are not current measurements.

Before launch: set the real business contact email, confirm project case-study details, add canonical/Open Graph URLs for the final domain, and review the hosting privacy statement.

## Files

- index.html: seven narratives, navigation, metadata, project briefing.
- src/style.css: shared foundations and original component styling.
- src/redesign.css: light editorial theme and advanced loader.
- src/studio.css: seven-section design and systems illustration.
- src/main.js: navigation, reveals, project dialogs and brief states.
- src/loader.js: startup and form loading component.
- src/brief.js: brief formatting and safe email draft links.
- tests: functional and content-structure checks.

## Section-specific motion

src/motion.js and src/motion.css add native section reveals, hero connection flow, desktop card tilt, a scroll-linked process timeline, ambient search/studio light passes, and menu/dialog/form-result transitions. The header pause control disables decorative motion. Reduced-motion preferences and offscreen/background suspension are built in. No animation dependency was added.

Latest browser verification succeeded on the reopened preview: pause/resume via keyboard, project dialogs, process progress, form loader/result, mobile and desktop layouts, with no console errors or warnings. The earlier blocked-tab limitation is resolved for these checks.

## Heading and portfolio repair

Headings now have a single word-translation reveal, without competing parent clipping, 3D rotation or blur. Tiruttani Quick displays its actual storefront screenshot inside a linked browser frame. Eight automated checks and the production build pass.


## Recording-inspired motion

reference-motion.js and reference-motion.css add a hero entrance after the startup curtain, a continuous discipline marquee, scroll-lit studio copy, a parallax monogram, and a sticky five-stage desktop process timeline. Narrow or short viewports keep the vertical process layout. Pause and reduced-motion settings restore static content. Verified desktop stage progression, 390px mobile layout, pause/resume, and no browser warnings or errors. Eight checks and the production build pass.

