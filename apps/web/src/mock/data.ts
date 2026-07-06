import type { Category, Product, Order, InventoryLog } from "./types";
import p1 from "@/assets/product-1.jpg";
import p2 from "@/assets/product-2.jpg";
import p3 from "@/assets/product-3.jpg";
import p4 from "@/assets/product-4.jpg";
import p5 from "@/assets/product-5.jpg";
import p6 from "@/assets/product-6.jpg";

export const categories: Category[] = [
  { id: "c1", name: "Sandal Pria", slug: "pria" },
  { id: "c2", name: "Sandal Wanita", slug: "wanita" },
  { id: "c3", name: "Sandal Anak", slug: "anak" },
  { id: "c4", name: "Sandal Jepit", slug: "jepit" },
  { id: "c5", name: "Sandal Sport", slug: "sport" },
];

const SIZES_DEWASA = ["38", "39", "40", "41", "42", "43"];
const SIZES_ANAK = ["28", "30", "32", "34", "36"];

export const products: Product[] = [
  {
    id: "p1", slug: "sandal-jepit-classic-hitam", name: "Sandal Jepit Classic Pria",
    sku: "JP-001", categoryId: "c4", price: 12500, stock: 1240,
    description: "Sandal jepit klasik berbahan karet EVA tebal, nyaman dipakai sehari-hari. Cocok untuk grosir warung dan toko kelontong.",
    sizes: SIZES_DEWASA, colors: ["Hitam", "Coklat", "Navy"],
    images: [p1, p1, p1], bestSeller: true, featured: true,
  },
  {
    id: "p2", slug: "sandal-slipper-soft-pink", name: "Sandal Slipper Soft Wanita Pita",
    sku: "WP-102", categoryId: "c2", price: 18500, stock: 850,
    description: "Sandal slipper wanita dengan aksen pita, bahan empuk dan ringan. Ready stock berbagai warna pastel.",
    sizes: SIZES_DEWASA, colors: ["Pink", "Putih", "Cream"],
    images: [p2, p2, p2], bestSeller: true, featured: true,
  },
  {
    id: "p3", slug: "sandal-karakter-anak", name: "Sandal Karakter Anak Lucu",
    sku: "AN-203", categoryId: "c3", price: 14000, stock: 120,
    description: "Sandal anak motif karakter lucu, sol anti slip. Tersedia ukuran lengkap untuk usia 3-10 tahun.",
    sizes: SIZES_ANAK, colors: ["Pink", "Biru", "Kuning"],
    images: [p3, p3, p3], featured: true,
  },
  {
    id: "p4", slug: "sandal-kulit-pria-coklat", name: "Sandal Kulit Sintetis Pria Premium",
    sku: "KP-310", categoryId: "c1", price: 45000, stock: 320,
    description: "Sandal kulit sintetis kualitas premium, cocok untuk kerja dan jalan-jalan. Jahitan rapi, awet, dan stylish.",
    sizes: SIZES_DEWASA, colors: ["Coklat", "Hitam"],
    images: [p4, p4, p4], bestSeller: true, featured: true,
  },
  {
    id: "p5", slug: "sandal-wedges-wanita-putih", name: "Sandal Wedges Wanita Casual",
    sku: "WD-415", categoryId: "c2", price: 52000, stock: 180,
    description: "Sandal wedges anyaman rotan ala espadrille. Cocok untuk acara santai maupun semi formal.",
    sizes: SIZES_DEWASA, colors: ["Putih", "Hitam", "Tan"],
    images: [p5, p5, p5], featured: true,
  },
  {
    id: "p6", slug: "sandal-sport-anak-biru", name: "Sandal Sport Anak Velcro",
    sku: "SP-520", categoryId: "c5", price: 28000, stock: 420,
    description: "Sandal sport anak dengan perekat velcro, sol empuk anti slip. Tahan air dan nyaman untuk bermain.",
    sizes: SIZES_ANAK, colors: ["Biru", "Merah", "Hitam"],
    images: [p6, p6, p6], bestSeller: true, featured: true,
  },
  {
    id: "p7", slug: "sandal-gunung-adventure-pria", name: "Sandal Gunung Adventure Pria",
    sku: "GN-601", categoryId: "c5", price: 65000, stock: 240,
    description: "Sandal gunung dengan tali tahan air, sol vibram grip kuat. Pilihan utama pendaki dan traveler.",
    sizes: SIZES_DEWASA, colors: ["Hitam", "Hijau Army", "Abu"],
    images: [p1, p1, p1], bestSeller: true,
  },
  {
    id: "p8", slug: "sandal-rumah-empuk", name: "Sandal Rumah Tangga Bulu",
    sku: "RT-705", categoryId: "c2", price: 16500, stock: 980,
    description: "Sandal rumah berbulu empuk, hangat dan anti slip. Cocok untuk hadiah souvenir.",
    sizes: SIZES_DEWASA, colors: ["Pink", "Abu", "Coklat"],
    images: [p2, p2, p2],
  },
  {
    id: "p9", slug: "sandal-jepit-pelangi-anak", name: "Sandal Jepit Pelangi Anak",
    sku: "JP-810", categoryId: "c3", price: 8500, stock: 75,
    description: "Sandal jepit anak motif pelangi, harga grosir paling murah untuk pasar.",
    sizes: SIZES_ANAK, colors: ["Mix Warna"],
    images: [p3, p3, p3],
  },
  {
    id: "p10", slug: "sandal-kerja-formal-pria", name: "Sandal Kerja Formal Pria",
    sku: "KP-920", categoryId: "c1", price: 38000, stock: 540,
    description: "Sandal semi formal cocok untuk kantoran kasual, bahan kulit sintetis high grade.",
    sizes: SIZES_DEWASA, colors: ["Hitam", "Coklat Tua"],
    images: [p4, p4, p4], featured: true,
  },
  {
    id: "p11", slug: "sandal-flat-wanita-bunga", name: "Sandal Flat Wanita Aksen Bunga",
    sku: "FW-130", categoryId: "c2", price: 24500, stock: 360,
    description: "Sandal flat dengan aksen bunga, ringan dan elegan. Cocok untuk hangout dan acara santai.",
    sizes: SIZES_DEWASA, colors: ["Hitam", "Nude", "Merah"],
    images: [p5, p5, p5],
  },
  {
    id: "p12", slug: "sandal-pria-japit-tali", name: "Sandal Japit Tali Pria Kasual",
    sku: "JT-140", categoryId: "c1", price: 22000, stock: 680,
    description: "Sandal japit dengan tali lebar, cocok untuk pantai dan jalan santai.",
    sizes: SIZES_DEWASA, colors: ["Coklat", "Hitam", "Biru"],
    images: [p1, p1, p1],
  },
  {
    id: "p13", slug: "sandal-anak-led", name: "Sandal Anak LED Menyala",
    sku: "LE-150", categoryId: "c3", price: 32000, stock: 95,
    description: "Sandal anak unik dengan lampu LED yang menyala saat dipakai jalan. Disukai anak-anak.",
    sizes: SIZES_ANAK, colors: ["Pink", "Biru"],
    images: [p6, p6, p6], featured: true,
  },
  {
    id: "p14", slug: "sandal-sport-pria-velcro", name: "Sandal Sport Pria Strap Velcro",
    sku: "SP-160", categoryId: "c5", price: 48000, stock: 280,
    description: "Sandal sport pria dengan 3 strap velcro adjustable, sol empuk untuk pemakaian lama.",
    sizes: SIZES_DEWASA, colors: ["Hitam", "Abu", "Navy"],
    images: [p6, p6, p6],
  },
  {
    id: "p15", slug: "sandal-jepit-polos-grosir", name: "Sandal Jepit Polos Grosir Murah",
    sku: "JP-170", categoryId: "c4", price: 6500, stock: 2400,
    description: "Sandal jepit polos paling murah untuk reseller pasar. Ready stock ribuan kodi.",
    sizes: SIZES_DEWASA, colors: ["Mix Warna"],
    images: [p1, p1, p1], bestSeller: true,
  },
];

export const initialOrders: Order[] = [
  {
    id: "ORD-20260621-001", createdAt: "2026-06-21T09:32:00",
    status: "Completed",
    customer: { name: "Toko Jaya Makmur", phone: "081234567890", address: "Jl. Pasar Baru No. 12, Banjarmasin", notes: "Mohon dipacking rapi" },
    items: [
      { productId: "p1", name: "Sandal Jepit Classic Pria", image: p1, price: 12500, qty: 100, size: "40", color: "Hitam" },
      { productId: "p15", name: "Sandal Jepit Polos Grosir Murah", image: p1, price: 6500, qty: 200, size: "39", color: "Mix" },
    ],
    total: 100 * 12500 + 200 * 6500,
  },
  {
    id: "ORD-20260622-002", createdAt: "2026-06-22T08:14:00",
    status: "Processing",
    customer: { name: "Reseller Surabaya", phone: "082345678901", address: "Jl. Wonokromo 45, Surabaya" },
    items: [
      { productId: "p2", name: "Sandal Slipper Soft Wanita Pita", image: p2, price: 18500, qty: 50, size: "38", color: "Pink" },
    ],
    total: 50 * 18500,
  },
  {
    id: "ORD-20260622-003", createdAt: "2026-06-22T10:45:00",
    status: "Pending",
    customer: { name: "Bpk. Slamet", phone: "081298765432", address: "Pasar Klewer Blok C, Solo", notes: "Hubungi sebelum kirim" },
    items: [
      { productId: "p4", name: "Sandal Kulit Sintetis Pria Premium", image: p4, price: 45000, qty: 40, size: "41", color: "Coklat" },
      { productId: "p10", name: "Sandal Kerja Formal Pria", image: p4, price: 38000, qty: 30, size: "42", color: "Hitam" },
    ],
    total: 40 * 45000 + 30 * 38000,
  },
  {
    id: "ORD-20260620-004", createdAt: "2026-06-20T14:20:00",
    status: "Shipped",
    customer: { name: "Ibu Rahma", phone: "085612345678", address: "Komplek Griya Indah Blok B-12, Medan" },
    items: [
      { productId: "p3", name: "Sandal Karakter Anak Lucu", image: p3, price: 14000, qty: 80, size: "32", color: "Pink" },
      { productId: "p13", name: "Sandal Anak LED Menyala", image: p6, price: 32000, qty: 25, size: "30", color: "Biru" },
    ],
    total: 80 * 14000 + 25 * 32000,
  },
  {
    id: "ORD-20260619-005", createdAt: "2026-06-19T11:10:00",
    status: "Completed",
    customer: { name: "Grosir Tanah Abang", phone: "081111222333", address: "Blok A2 Lt 3 No 88, Tanah Abang, Jakarta" },
    items: [
      { productId: "p7", name: "Sandal Gunung Adventure Pria", image: p1, price: 65000, qty: 60, size: "42", color: "Hitam" },
    ],
    total: 60 * 65000,
  },
  {
    id: "ORD-20260622-006", createdAt: "2026-06-22T13:05:00",
    status: "Pending",
    customer: { name: "Toko Sepatu Bandung", phone: "082199887766", address: "Cibaduyut Raya No. 21, Bandung" },
    items: [
      { productId: "p5", name: "Sandal Wedges Wanita Casual", image: p5, price: 52000, qty: 35, size: "39", color: "Putih" },
      { productId: "p11", name: "Sandal Flat Wanita Aksen Bunga", image: p5, price: 24500, qty: 40, size: "38", color: "Nude" },
    ],
    total: 35 * 52000 + 40 * 24500,
  },
  {
    id: "ORD-20260618-007", createdAt: "2026-06-18T16:40:00",
    status: "Completed",
    customer: { name: "CV Sandal Sejahtera", phone: "081444555666", address: "Jl. Industri No. 5, Tangerang" },
    items: [
      { productId: "p6", name: "Sandal Sport Anak Velcro", image: p6, price: 28000, qty: 150, size: "30", color: "Biru" },
    ],
    total: 150 * 28000,
  },
  {
    id: "ORD-20260615-008", createdAt: "2026-06-15T09:00:00",
    status: "Completed",
    customer: { name: "Toko Anugerah", phone: "081777888999", address: "Jl. Veteran 12, Yogyakarta" },
    items: [
      { productId: "p8", name: "Sandal Rumah Tangga Bulu", image: p2, price: 16500, qty: 120 },
    ],
    total: 120 * 16500,
  },
  {
    id: "ORD-20260622-009", createdAt: "2026-06-22T15:30:00",
    status: "Processing",
    customer: { name: "Hj. Aminah", phone: "082233445566", address: "Pasar Tanjung Bumi, Madura" },
    items: [
      { productId: "p15", name: "Sandal Jepit Polos Grosir Murah", image: p1, price: 6500, qty: 500 },
    ],
    total: 500 * 6500,
  },
  {
    id: "ORD-20260612-010", createdAt: "2026-06-12T12:00:00",
    status: "Completed",
    customer: { name: "Toko Berkah Jaya", phone: "081333222111", address: "Jl. Mayor Salim 78, Palembang" },
    items: [
      { productId: "p14", name: "Sandal Sport Pria Strap Velcro", image: p6, price: 48000, qty: 45, size: "41", color: "Hitam" },
    ],
    total: 45 * 48000,
  },
];

export const initialInventoryLogs: InventoryLog[] = [
  { id: "INV-001", productId: "p1", productName: "Sandal Jepit Classic Pria", type: "IN", qty: 500, note: "Restock dari pabrik Cibaduyut", createdAt: "2026-06-21T08:00:00" },
  { id: "INV-002", productId: "p3", productName: "Sandal Karakter Anak Lucu", type: "OUT", qty: 80, note: "Pesanan ORD-20260620-004", createdAt: "2026-06-20T14:25:00" },
  { id: "INV-003", productId: "p9", productName: "Sandal Jepit Pelangi Anak", type: "OUT", qty: 200, note: "Pesanan grosir besar", createdAt: "2026-06-19T10:00:00" },
  { id: "INV-004", productId: "p2", productName: "Sandal Slipper Soft Wanita Pita", type: "IN", qty: 300, note: "Restock dari supplier Bandung", createdAt: "2026-06-18T09:00:00" },
  { id: "INV-005", productId: "p7", productName: "Sandal Gunung Adventure Pria", type: "OUT", qty: 60, note: "Pesanan ORD-20260619-005", createdAt: "2026-06-19T11:15:00" },
  { id: "INV-006", productId: "p15", productName: "Sandal Jepit Polos Grosir Murah", type: "IN", qty: 1000, note: "Produksi internal", createdAt: "2026-06-17T07:30:00" },
];
