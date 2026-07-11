import type { Order } from "@/mock/types";
import type { ApiOrderDetail } from "@/lib/api/types";
import { rupiah } from "./format";

export const WHATSAPP_NUMBER = "6282276441753";

/**
 * Build a WhatsApp order message from a persisted API order. API money is in
 * minor units, so divide by 100 to match the storefront's whole-rupiah display.
 */
export function buildWhatsAppApiOrderUrl(order: ApiOrderDetail): string {
  const toRupiah = (minor: number) => rupiah(Math.round(minor / 100));
  const lines: string[] = [];
  lines.push("Halo Admin, saya ingin memesan:");
  lines.push("");
  order.items.forEach((it, i) => {
    lines.push(
      `${i + 1}. ${it.productName} x ${it.quantity} = ${toRupiah(it.lineTotal.amount)}`,
    );
  });
  lines.push("");
  lines.push(`*Total: ${toRupiah(order.total.amount)}*`);
  lines.push("");
  lines.push(`Nama   : ${order.customer.name}`);
  lines.push(`No HP  : ${order.customer.phone}`);
  lines.push(`Alamat : ${order.customer.address}`);
  if (order.customer.notes) lines.push(`Catatan: ${order.customer.notes}`);
  lines.push("");
  lines.push(`Kode Pesanan: ${order.orderNumber}`);
  const text = encodeURIComponent(lines.join("\n"));
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
}

export function buildWhatsAppOrderUrl(order: Order): string {
  const lines: string[] = [];
  lines.push("Halo Admin, saya ingin memesan:");
  lines.push("");
  order.items.forEach((it, i) => {
    lines.push(
      `${i + 1}. ${it.name} (${it.size ?? "-"}, ${it.color ?? "-"}) x ${it.qty} = ${rupiah(it.price * it.qty)}`,
    );
  });
  lines.push("");
  lines.push(`*Total: ${rupiah(order.total)}*`);
  lines.push("");
  lines.push(`Nama   : ${order.customer.name}`);
  lines.push(`No HP  : ${order.customer.phone}`);
  lines.push(`Alamat : ${order.customer.address}`);
  if (order.customer.notes) lines.push(`Catatan: ${order.customer.notes}`);
  lines.push("");
  lines.push(`Kode Pesanan: ${order.id}`);
  const text = encodeURIComponent(lines.join("\n"));
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
}

export const waChatUrl = (msg = "Halo Admin, saya ingin bertanya stok sandal.") =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
