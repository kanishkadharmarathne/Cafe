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
| `/admin` | Role-gated administration workspace, including the kitchen queue |
| `/admin/kitchen` | Redirects to the kitchen tab in the administration workspace |
| Any other path | Branded not-found page |

The public shell shares the navbar and footer. Admin workspace sections are selected inside the admin page. The workspace checks the authenticated user's `profiles.role`; kitchen users can access only the kitchen tab, while admins and super-admins retain their existing sections. Database RLS and RPC permissions must also enforce access.

## Integrations and configuration

The browser Supabase client in `src/lib/supabase.ts` reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the local environment. Configure these values in an ignored local `.env` file; never commit credentials. Customer authentication, menu retrieval, contact messages, order history, checkout persistence, and administration continue to use the existing Supabase integration. This phase does not change database schemas or production data.

Restaurant street address, phone, email, and opening hours have not been supplied, so they are intentionally not displayed. The map link points to the general Arad, Romania search area rather than implying an exact restaurant pin.

## Design and currency

Shared CSS tokens define the forest-green, warm-gold, cream, white, charcoal, and muted-gray palette, typography, spacing constraints, radii, and focus treatment. `formatCurrency` is the single UI formatter for RON amounts and uses `ro-RO` with two decimal places. Stored amounts are presented as-is; no exchange-rate conversion is performed.

## Menu and categories

The public menu reads active categories and products from Supabase in display order. The header language selector chooses the English or Romanian menu fields and stores the preference locally. Unavailable products remain visible but cannot be added to the cart; featured products are shown separately. Images come from each record's `image_url`.

The existing admin menu supports editing both languages, ordering, visibility and product availability. Category and product images can be uploaded to the existing `taste_of_ceylon_menu_images` bucket. Uploads and database edits require the corresponding Supabase permissions; no service-role key is used by the frontend.

## Orders and kitchen

Customer and admin order creation send the selected `low`, `medium`, or `high` spice level to `create_order_secure`; displayed subtotals are estimates and are not submitted. Kitchen staff see permitted orders, can refresh the queue, and use `update_order_status_secure` for status transitions, including cancellation of active orders after confirmation. The queue also refreshes every 30 seconds. Neither workflow updates payment status.

Admins can create orders and browse the searchable, filterable order table in the same Orders section. Viewing an order reveals its items and history, and switching between the table and creation form retains an unfinished order while the section remains open. The table refreshes after a successful creation.

Dine-in addition details show items and status changes from `order_addition_status_history`, supplemented by available draft, submission, completion, and cancellation timestamps when an audit entry is missing. The backend must record status transitions in that table and permit admin reads through RLS; older intermediate transitions cannot be reconstructed if they were not recorded.

Admins can add items to dine-in orders even when the original order is completed; cancelled orders cannot receive additions. The secure addition RPCs must enforce the same rule.

The backend must store and return `orders.spice_level`, accept it in `create_order_secure`, grant the appropriate kitchen role access to the order and item reads, and enforce role and transition checks in `update_order_status_secure`. These database contracts and policies are not defined in this repository and must be verified against the deployed environment. Dine-in editing is disabled until an admin-only transactional edit RPC can validate the existing order and its items and recalculate totals without changing payment status or order history.

## Development

- `npm run dev` — start the Vite development server
- `npm run build` — run TypeScript project checks and create a production build
- `npm run lint` — run ESLint
- `npm run preview` — preview the production build

On Node.js 24, run the isolated order tests with `node --test tests/adminAccess.test.ts tests/orderFilters.test.ts tests/kitchenWorkflow.test.ts tests/orders.test.mjs`. The RPC tests use a mock and block network requests; they do not verify deployed Supabase permissions or database behavior.
