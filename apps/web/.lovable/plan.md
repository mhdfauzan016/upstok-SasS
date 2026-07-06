
# Sandalia Grosir — Frontend Prototype

Building a complete UI prototype (no backend) for an Indonesian wholesale sandal platform, styled after **tokomurahgrosir.com**: clean white background, blue primary, orange accent, dense category navigation, product card grid sections, sticky WhatsApp button.

## Design direction

Matching the reference site:
- **Palette:** White background, **blue primary** (`#1c5d99`-ish, like the reference), **orange accent** (`#e87722`) for CTAs/prices/highlights. Note: this differs from the green/orange you mentioned earlier — going with blue/orange to match the reference. Say the word if you want green primary instead.
- **Typography:** Clean sans-serif (Inter / Plus Jakarta Sans), bold section titles with colored highlight word (e.g. "**Produk Pilihan** dari Kami").
- **Layout:** Top utility bar (date + WhatsApp link + register), main header with logo + search + cart + login, horizontal category nav, hero banner/video area, then stacked product sections.
- **Components:** Compact product cards (image, name, price in orange, stock badge, "Tambah" button), category pill nav, sticky floating WhatsApp button bottom-right.
- **Language:** Bahasa Indonesia throughout.
- **Currency:** Rupiah (Rp 15.000 format).

## Routes (TanStack Start)

Customer-facing:
- `/` — Landing: hero banner, "Mengapa Pilih Kami" (4 trust badges), kategori cards (Pria/Wanita/Anak), "Produk Pilihan", "Terlaris", testimoni, WhatsApp CTA, footer
- `/produk` — Catalog: search bar, category filter sidebar, product grid, pagination
- `/produk/$slug` — Product detail: gallery, deskripsi, ukuran/warna, stock, quantity, "Tambah ke Keranjang"
- `/keranjang` — Cart with qty adjust + remove + summary
- `/checkout` — Form (nama, no HP, alamat, catatan) + order summary + "Pesan via WhatsApp" button that generates a `wa.me/6282276441753?text=...` URL with the order details and redirects

Admin:
- `/admin/login` — Mock email/password (hardcoded `admin@sandalia.id` / `admin123`, stored in sessionStorage)
- `/admin` — Dashboard: KPI cards (Total Produk, Total Stok, Pesanan Hari Ini, Pesanan Bulan Ini), Pesanan Terbaru widget, Stok Menipis widget, Best Selling widget, Recharts line + bar charts
- `/admin/produk` — Product table (search, kategori filter, add/edit/delete dialogs, multi-image upload UI mock)
- `/admin/kategori` — Category CRUD
- `/admin/pesanan` — Order list w/ status tabs (Pending/Processing/Shipped/Completed), order detail drawer
- `/admin/inventori` — Stok In/Out form, riwayat tabel, low-stock alerts
- `/admin/laporan` — Export buttons (Excel/CSV) using `xlsx` lib

Layout: `_admin` pathless layout route with sidebar (shadcn `Sidebar`) + auth guard checking sessionStorage.

## Data layer (mock)

- `src/mock/products.ts` — ~20 realistic Indonesian sandal products across Pria/Wanita/Anak with SKU, harga grosir, stock, deskripsi, ukuran [36–44], warna, multiple image URLs (use Unsplash / generated images)
- `src/mock/categories.ts`, `src/mock/orders.ts` (~15 sample orders w/ varied statuses), `src/mock/inventory-logs.ts`
- `src/store/cart.ts` — Zustand cart store, persisted to localStorage
- `src/store/orders.ts` — Zustand orders store (persisted) so checkout actually saves an order locally before redirecting to WhatsApp, and the admin "Pesanan" page reflects it

## WhatsApp integration

Single helper `buildWhatsAppOrderUrl(order)` that formats:
```
Halo Admin Sandalia, saya ingin memesan:
1. [Produk] x [Qty] — Rp [subtotal]
...
Total: Rp [total]
Nama: ...
No HP: ...
Alamat: ...
Catatan: ...
```
URL-encoded into `https://wa.me/6282276441753?text=...`, opened in new tab on checkout submit.

## Tech notes

- shadcn for all UI (Card, Table, Dialog, Drawer, Sidebar, Tabs, Form, Input, Select, Sonner toast)
- Recharts for admin charts
- `lucide-react` icons (sparingly — ShoppingCart, Search, MessageCircle, Package, TrendingUp)
- Hero/product images: generate ~6 with imagegen (sandal product shots on white), reuse across the catalog
- Mobile-first responsive: hamburger menu on customer site, collapsible sidebar on admin

## Out of scope

- No real auth, no database, no real file upload (admin product images are UI mock)
- No order persistence across browsers (localStorage only)
- No payment

Approve and I'll build it out.
