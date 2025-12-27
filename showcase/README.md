# @digitaldefiance/node-express-suite Showcase

This is the GitHub Pages showcase site for **@digitaldefiance/node-express-suite**, a complete backend infrastructure framework for building secure Node.js/Express applications with MongoDB, JWT authentication, RBAC, and cryptographic operations. Built with React, TypeScript, and Vite.

## About Node Express Suite

`@digitaldefiance/node-express-suite` provides:
- Complete Express/MongoDB backend infrastructure with MERN stack
- ECIES encryption/decryption and PBKDF2 key derivation
- JWT authentication with role-based access control (RBAC)
- Multi-language i18n support via @digitaldefiance/i18n-lib
- Dynamic model registry system with extensible document models
- Email token workflows for verification, password reset, and recovery
- Mnemonic authentication and secure backup codes
- Service container, fluent builders, and plugin architecture

## Development

```bash
cd showcase
npm install
npm run dev
```

Visit `http://localhost:5173` to see the site.

## Building

```bash
npm run build
```

The built site will be in the `dist` directory.

## Deployment

The site is automatically deployed to GitHub Pages when changes are pushed to the `main` branch. The deployment is handled by the `.github/workflows/deploy-showcase.yml` workflow.

## Technology Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Framer Motion** - Animations
- **React Icons** - Icon library
- **React Intersection Observer** - Scroll animations

## Structure

- `/src/components` - React components
- `/src/assets` - Static assets
- `/public` - Public files
- `index.html` - Entry HTML file
- `vite.config.ts` - Vite configuration
