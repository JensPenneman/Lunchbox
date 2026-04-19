# Data Model — Brainstorm

> Status: draft / in-progress. Nothing here is final. Fields are rough sketches, not schemas.
> Use `OPEN:` for unresolved questions, `TODO:` for "come back to this", `NOTE:` for decisions we've already made.

## How to read this doc

- Entities are grouped by domain area. An entity can live in one area but be referenced across many.
- Field notes use a loose `name (type) — note` format. Don't treat the types as authoritative.
- Relationships are described in prose under each entity, not drawn as a diagram (yet).
- When we're happy with a chunk, it graduates to `data-model/` as proper TS/schema files.

---

## Glossary / Core concepts

Pinning down language early so we don't talk past each other.

- **Tenant** — a merchant/vendor on the platform (sandwich shop, bakery, traiteur). A tenant owns their own data, their own storefront(s), their own menu.
- **Storefront** — the public-facing ordering experience for a tenant. May be on a custom domain (broodjes-jan.be) or on a lunchbox subdomain. `OPEN:` can a tenant have multiple storefronts (e.g. per location), or is storefront == tenant?
- **Customer** — anyone placing an order. Can be a walk-in consumer, an employee of a Company, a school student, etc.
- **Company** — a B2B buyer: the office/school/organization whose employees/members order lunch together. Pays via invoice and/or configures employer contribution.
- **Group order** — a coordinated order with a deadline, where multiple people (usually from one Company) add their individual orders, which get consolidated into one delivery/pickup.
- **Supplier** — upstream B2B: whoever sells ingredients/products to the Tenant. (Later concern — flagged for scope.)
- **Meal voucher** — Edenred / Monizze / Pluxee. Digital-only in 2026. Effectively a second wallet on top of the user's own money.

`OPEN:` do we model "Location" separately from Tenant? A tenant with 3 physical shops might want 3 opening-hour sets, 3 prep queues, but 1 menu. Gut says yes, separate Location.

---

## 1. Tenancy & Identity

### Tenant
The merchant account. Root of most data.
- id
- name
- legal_name
- vat_number — Belgian BTW (`BE0XXXXXXXXX`)
- kbo_number — 10-digit enterprise number (same as VAT without `BE` prefix, typically)
- favv_permit_type — `registration | authorization | approval`
- default_locale — `nl | fr | en`
- supported_locales — subset of the above
- created_at / updated_at
- status — `onboarding | active | suspended | closed`

`OPEN:` is `Tenant` the billing entity (what we invoice) or is there a separate `Organization`/`Account` above it? Matters if one owner runs multiple brands.

### Location
A physical site belonging to a Tenant. Where food is prepared / picked up.
- id, tenant_id
- name (e.g. "Gent — Korenmarkt")
- address (street, number, postal_code, city, country)
- geo (lat, lng)
- phone
- timezone — always `Europe/Brussels` in practice, but storing it avoids surprises
- opening_hours — see OpeningHours
- prep_capacity — `OPEN:` do we model kitchen throughput (orders per 15min slot)?

### Storefront
The branded ordering site. `OPEN:` kept separate from Tenant in case we go white-label-first.
- id, tenant_id
- slug (for lunchbox-hosted: `lunchbox.be/s/jan`)
- custom_domain (nullable, e.g. `broodjes-jan.be`)
- theme — logo, colors, fonts
- default_locale
- published (bool)

### User
Auth identity. One human = one User, even if they shop across multiple tenants.
- id
- email
- phone (nullable)
- password_hash / passkey / oauth_provider — `OPEN:` which auth methods?
- preferred_locale
- created_at
- `TODO:` GDPR — soft-delete vs hard-delete, data export

### MerchantUser (join)
Grants a User access to a Tenant with a role.
- user_id, tenant_id
- role — `owner | manager | staff | accountant`
- invited_at, accepted_at

### Customer
A consumer-side profile. Separate from User? `OPEN:` — could be merged. Argument for splitting: a guest can place an order without a User account.
- id
- user_id (nullable — null = guest)
- display_name
- default_delivery_location_id (nullable)
- allergen_flags — persistent dietary restrictions
- `OPEN:` do we want per-tenant customer profiles, or one global?

---

## 2. Company / B2B buyer side

### Company
An organization whose members order through Lunchbox.
- id
- name
- vat_number (nullable — schools often won't have one in the usable sense)
- type — `business | school | other`
- billing_address
- peppol_id — for e-invoicing (mandatory B2B as of 2026-01-01)
- invoicing_method — `peppol | email_pdf_legacy` (legacy = grace period only)
- employer_contribution_policy — nullable; see below
- default_locale

### CompanyMember
A person who belongs to a Company and can order under its umbrella.
- id, company_id, user_id (nullable for schools where parents order for kids?)
- display_name
- role — `member | admin | billing_contact`
- spending_limits — `OPEN:` per day / per week / per month?
- employer_contribution_override (nullable)

### EmployerContribution
How much the Company chips in per order/meal. `OPEN:` very open — could be flat, percent, capped.
- company_id (or member_id for override)
- type — `flat_per_order | percent | capped_flat`
- amount
- applies_to — `all_orders | group_orders_only | specific_tenants`

`OPEN:` schools case — parent-managed accounts. Is a "parent" modeled as a CompanyMember with `role: billing_contact` linked to a "student" CompanyMember? Or as a separate Guardian relationship?

---

## 3. Menu / Catalog

All menu entities are per-Tenant. Translations are per-locale.

### Category
- id, tenant_id
- name (translatable)
- sort_order
- parent_category_id (nullable — nested?)
- availability — always / lunch-only / breakfast-only — `OPEN:` time-windowed categories?

### Product
The thing you buy. Called "Product" rather than "MenuItem" to stay neutral if we later sell non-food.
- id, tenant_id
- sku (nullable)
- name (translatable)
- description (translatable)
- category_ids (many)
- images
- base_price
- vat_rate_id — 6% / 12% / 21% — see Tax section
- is_takeaway_prepared_meal (bool) — flags the 12% VAT case from 2026
- allergens (many — see Allergen)
- dietary_tags (many — vegan, halal, gluten-free, ...)
- availability — always / scheduled / sold-out
- `OPEN:` do we model shelf-life? (VAT rule is "prepared meals with shelf life up to 2 days")

### ProductVariant
Size / flavor — things that change price or SKU.
- id, product_id
- name (translatable)
- price_delta (can be negative)
- sku

### ProductOption / OptionGroup
Customizations: "extra cheese", "no mayo", "choose bread type".
- OptionGroup: id, product_id, name, min_selections, max_selections, required
- Option: id, option_group_id, name (translatable), price_delta

`OPEN:` modifier pricing — do we let modifiers change VAT rate? (A drink added to a sandwich could cross categories.)

### Allergen
EU-14 list (gluten, crustaceans, eggs, fish, peanuts, soybeans, milk, nuts, celery, mustard, sesame, SO2, lupin, molluscs).
- id
- code (enum)
- name (translatable — mostly static)

### DietaryTag
- id
- code — `vegan | vegetarian | halal | kosher | gluten_free | lactose_free | ...`
- name (translatable)

---

## 4. Orders

### Order
An individual order, regardless of whether it's part of a group.
- id
- tenant_id
- storefront_id
- location_id — fulfillment site
- customer_id (or guest_contact blob)
- group_order_id (nullable)
- status — see status machine below
- fulfillment_type — `pickup | delivery`
- fulfillment_time — requested slot
- delivery_address (nullable, if delivery)
- subtotal, vat_total, total
- currency — always EUR, but stored anyway
- payment_id (nullable until paid)
- invoice_id (nullable)
- placed_at, confirmed_at, ready_at, fulfilled_at, cancelled_at
- notes

`OPEN:` do we persist a full price snapshot on the order (product name/price at purchase time) or just reference Product? Strong lean toward snapshot — menu changes shouldn't mutate historical orders.

### OrderLine
- id, order_id
- product_id, product_variant_id
- selected_options (many)
- quantity
- unit_price_snapshot
- vat_rate_snapshot
- line_total

### OrderStatus (state machine)
- `draft` → `pending_payment` → `paid` → `accepted` → `preparing` → `ready` → `out_for_delivery` (delivery only) → `fulfilled`
- any → `cancelled` / `refunded`
- `OPEN:` who can transition which? needs a permissions table.

### GroupOrder
The consolidated team lunch.
- id
- company_id (nullable — could be ad-hoc)
- tenant_id — the shop fulfilling
- location_id
- organizer_user_id
- share_token (unique — the "unique link")
- deadline — cutoff for individual orders
- fulfillment_type, fulfillment_time, delivery_address
- consolidation_status — `collecting | closed | sent_to_shop | fulfilled | cancelled`
- employer_contribution_applied (denormalized summary)

`OPEN:` can a single GroupOrder span multiple Tenants? Smosser seems to assume one shop per group. Simpler to start there.

`OPEN:` recurring group orders — "every Tuesday at noon" — separate entity `GroupOrderSchedule` or cron-style field on GroupOrder?

---

## 5. Fulfillment

### OpeningHours
- location_id
- day_of_week
- open_time, close_time
- valid_from, valid_until (nullable — for holiday overrides)

### DeliveryZone
- id, tenant_id (or location_id)
- polygon or postal_code_list — `OPEN:` which shape?
- min_order_value (nullable)
- delivery_fee
- estimated_time_minutes

### DeliverySlot / Shift
Time windows when orders can be fulfilled. Group orders lock to a slot.
- id, location_id
- start_at, end_at
- capacity — max orders in this slot
- type — `pickup | delivery | both`

---

## 6. Payments

### Payment
One attempt at paying an Order (or a consolidated bill).
- id
- order_id (or invoice_id for B2B post-pay)
- amount
- currency
- method — see enum below
- status — `pending | authorized | captured | failed | refunded | partially_refunded`
- provider — `mollie | adyen | stripe | ...` `OPEN:` pick one
- provider_reference
- created_at, captured_at

### PaymentMethod (enum / taxonomy)
- `bancontact` / `bancontact_pay` (QR — Payconiq rebrand)
- `wero` — future-facing, EPI replacement
- `card` — Visa/Mastercard
- `sepa_direct_debit` — "Fast Checkout" style, eligible for discount
- `ideal` / `cartes_bancaires` — cross-border NL/FR
- `meal_voucher` — Edenred/Monizze/Pluxee, via provider
- `wallet` — prepaid platform balance
- `invoice` — B2B post-pay
- `paypal` — optional
- `cash` — pickup-at-counter? `OPEN:` do we support?

### Wallet
Per-Customer prepaid balance.
- id, customer_id
- balance
- currency
- `OPEN:` is this per-tenant or global? Smosser's is platform-wide.

### MealVoucherAccount
Link to employee's Edenred/Monizze/Pluxee wallet. May just be a tokenized pointer we never hold balance for.
- id, user_id
- provider — `edenred | monizze | pluxee`
- external_ref
- linked_at
- `NOTE:` actual balance probably stays at provider, not in our DB.

### Payout
Merchant gets paid.
- id, tenant_id
- period_start, period_end
- gross_amount, fees, net_amount
- status — `scheduled | sent | failed`
- method — `sepa`
- executed_at

`NOTE:` Smosser advertises *daily* payouts. We should support it without requiring it.

---

## 7. Invoicing (Peppol)

### Invoice
- id
- type — `b2b | b2c | merchant_payout`
- tenant_id (for merchant-side invoices to the tenant from us)
- company_id / customer_id (recipient)
- invoice_number — regulated format
- issue_date, due_date
- line_items (many)
- subtotal, vat_breakdown, total
- peppol_status — `not_sent | sent | delivered | failed` (for applicable B2B)
- peppol_id — receiver's Peppol ID
- pdf_url
- paid_at (nullable)

### InvoiceLine
- id, invoice_id
- description
- quantity, unit_price
- vat_rate
- line_total
- references — order_id(s), group_order_id, period, etc.

`OPEN:` credit notes as a separate entity or as negative invoices? Belgian practice leans toward separate `CreditNote` with its own numbering.

`OPEN:` who issues the invoice to the end customer — the Tenant, or Lunchbox on behalf of the Tenant? Huge implication for who the VAT flows through.

---

## 8. Tax

### VatRate
- id
- code — `6 | 12 | 21`
- rate (decimal)
- applies_from, applies_until (for the 2026 takeaway change)
- description (translatable)

### TaxCategory (maybe overkill for now)
- id
- name — `grocery | takeaway_prepared_meal | restaurant_service | alcohol | ...`
- default_vat_rate_id

`OPEN:` is `vat_rate_id` directly on Product enough, or do we go through TaxCategory? TaxCategory helps when rates change (2026 takeaway shift) — we re-point the category instead of every product.

---

## 9. Suppliers (upstream — later scope)

Flagged so we don't forget the upstream frontend exists, but kept minimal.

### Supplier
- id
- name, vat_number, peppol_id
- contact info

### SupplierProduct
- id, supplier_id
- name, unit, price, min_order_qty

### SupplierOrder
- id, supplier_id, tenant_id
- status, expected_delivery_at
- lines

`TODO:` defer deep modeling until after consumer + merchant loops are proven.

---

## 10. Translations / i18n

`OPEN:` big architectural decision — how do we model translatable fields?

Option A — JSON column per field:
- `product.name = { nl: "Broodje kaas", fr: "Sandwich fromage", en: "Cheese sandwich" }`

Option B — Separate translation table:
- `product_translations(product_id, locale, field, value)`

Option C — One translation row per entity:
- `product_translations(product_id, locale, name, description)`

Leaning toward C — simpler queries, one row per (entity, locale), predictable shape. A is fastest to ship. B is the most flexible but a query pain.

---

## 11. Audit / meta

`TODO:` we'll need this, leaving as a stub.
- AuditLog — who did what when
- WebhookEvent — incoming from payment providers, outbound to merchants
- Notification — email/push/SMS record

---

## Big open decisions (cross-cutting)

1. **Customer vs User** — merge or keep split? (see §1)
2. **Storefront scope** — 1:1 with Tenant, or 1:N (per brand/location)? (§1)
3. **Invoice issuer** — Tenant or Lunchbox on behalf? Changes VAT flow fundamentally. (§7)
4. **Translation strategy** — JSON column, translation table, or per-entity translations table? (§10)
5. **Guest checkout** — how far do we push "no account needed" before forcing signup?
6. **Multi-tenant group orders** — one shop per group, or can a Company order lunch split across 2 shops? (§4)
7. **Wallet scope** — platform-wide (Smosser-style) or per-Tenant?
8. **Price & menu snapshotting on orders** — snapshot everything vs reference-by-id?
9. **Peppol integration timing** — build in from day 1 or add once we have first B2B customer?
10. **Dark kitchen / virtual brand** — do we model a Tenant that has no physical Location? (Deliveroo Editions-style)

---

## Ideas parked (not in scope yet)

- Loyalty programs / stamp cards
- Gift cards
- Subscription meals ("every Tuesday")
- POS/Deliverect/Apicbase integrations
- Kitchen display system
- Driver / rider model (platform worker regs — complex)
- Review & rating system
