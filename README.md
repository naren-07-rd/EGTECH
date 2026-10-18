# EG TECH — Company Website

The official website for **EG TECH — Empowering Growth Technology**, a technology studio based in Tamil Nadu, India.

**Ideas today. Impact tomorrow.**

## About

EG TECH helps businesses and founders build websites, digital products, and automated software. This website presents our services, selected projects, delivery process, and project enquiry form.

## Features

- Responsive layouts for desktop, tablet, and mobile
- Light and dark themes
- Animated hero section and scroll effects
- Smooth scrolling powered by Lenis
- Subtle image parallax
- Circular mobile navigation
- Expandable service details
- Portfolio previews and project dialogs
- Website package selection linked to the enquiry form
- FAQ carousel with progress indicators and a full question list
- Project enquiries submitted through Formspree
- Support for reduced-motion preferences
- Terms and Conditions page

## Tech Stack

| Technology | Purpose |
|------------|---------|
| HTML5 | Page structure |
| CSS3 | Styling, responsive layouts, and animations |
| JavaScript ES Modules | Interactions and application logic |
| Vite | Local development and production builds |
| Lenis | Smooth scrolling |
| Formspree | Project enquiry submissions |
| Switzer and JetBrains Mono | Typography |
| Node.js test runner | Automated tests |

## Getting Started

Install a Node.js version supported by the project's Vite version, then run:

    npm ci
    npm run dev

Open the local URL printed in the terminal.

## Available Commands

| Command | Description |
|---------|-------------|
| npm run dev | Start the development server |
| npm test | Run the automated tests |
| npm run build | Generate the production website |
| npm run preview | Preview the production build locally |

## Project Structure

    index.html        Main website
    terms.html        Terms and Conditions
    src/              Styles, interactions, and animation modules
    public/           Images, fonts, icons, and robots.txt
    tests/            Automated tests
    scripts/          Additional verification scripts
    vite.config.js    Build configuration

## Project Enquiries

The enquiry form uses Formspree to submit visitor details and project requirements.

It includes:

- Name, email, and optional company
- Multiple service selections
- Website package, project scale, and timeline
- Project description
- Input validation and spam honeypot
- Loading, success, and error states
- Protection against duplicate submissions

The receiving email address is managed in the Formspree dashboard.

When adapting this project, replace the Formspree endpoint in both
`index.html` and `src/brief.js` with your own form endpoint.

Automated form tests use mocked responses. Confirm real delivery separately
through the Formspree dashboard and receiving inbox.

## Deployment

Use these settings with a hosting provider that supports Vite:

- Install command: `npm ci`
- Build command: `npm run build`
- Publish directory: `dist`

The build includes the homepage and Terms and Conditions page.

Install dependencies on the deployment host rather than uploading a local
`node_modules` folder. Do not commit `.env` files or credentials.

## Contact

**EG TECH — Empowering Growth Technology**

- Location: Tamil Nadu, India
- Email: narenthiranath703@gmail.com
- Phone: +91 7604921213

**Your next big idea. Let’s build it.**