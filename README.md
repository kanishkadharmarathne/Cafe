# Taste of Ceylon

The existing React application is the starting point for Taste of Ceylon, a Sri Lankan-inspired restaurant in Arad, Romania. Menu and order amounts are displayed in Romanian lei (RON) using Romanian locale formatting; existing numeric values are not converted.

## Application structure

```text
public/
  favicon.svg                 Brand mark used by the browser and app shell
src/
  App.tsx                     Route table, public layout, and not-found page
  app/                        Customer pages and admin feature modules
    admin/                    Role-gated dashboard, menus, messages, and orders
  component/                  Shared navigation, footer, auth, and checkout UI
  lib/
    currency.ts               Shared ro-RO / RON formatter
    supabase.ts               Supabase browser client
  index.css                   Base styles and design tokens
  brand.css                   Shared restaurant theme across customer/admin UI
  main.tsx                    Vite/React entry point
```

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Restaurant landing page |
| `/our-cafe` | Restaurant concept and values |
| `/menu` | Active menu, cart, and existing checkout flow |
| `/my-orders` | Signed-in customer's order history |
| `/contact` | Contact form and Arad location reference |
| `/our-legacy` | Restaurant philosophy (kept for existing links) |
| `/admin` | Role-gated administration workspace |
| Any other path | Branded not-found page |

The public shell shares the navbar and footer. Admin workspace sections are selected inside the admin page and remain protected by the existing Supabase profile-role checks.

## Integrations and configuration

The browser Supabase client in `src/lib/supabase.ts` reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the local environment. Configure these values in an ignored local `.env` file; never commit credentials. Customer authentication, menu retrieval, contact messages, order history, checkout persistence, and administration continue to use the existing Supabase integration. This phase does not change database schemas or production data.

Restaurant street address, phone, email, and opening hours have not been supplied, so they are intentionally not displayed. The map link points to the general Arad, Romania search area rather than implying an exact restaurant pin.

## Design and currency

Shared CSS tokens define the forest-green, warm-gold, cream, white, charcoal, and muted-gray palette, typography, spacing constraints, radii, and focus treatment. `formatCurrency` is the single UI formatter for RON amounts and uses `ro-RO` with two decimal places. Stored amounts are presented as-is; no exchange-rate conversion is performed.

## Development

- `npm run dev` — start the Vite development server
- `npm run build` — run TypeScript project checks and create a production build
- `npm run lint` — run ESLint
- `npm run preview` — preview the production build

There is no standalone test script in the current project.
