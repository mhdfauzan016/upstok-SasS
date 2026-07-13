import type { Order } from "@/mock/types";
import type { ApiOrderDetail } from "@/lib/api/types";
import { rupiah } from "./format";

/**
 * Normalizes a human-entered Indonesian phone number (as stored on the tenant's
 * branding record, e.g. "0822-7644-1753" or "+62 822 7644 1753") into the
 * digits-only, country-coded form wa.me expects ("6282276441753").
 * Returns "" when no usable number is provided.
 */
export function normalizeWaNumber(raw?: string | null): string {
  if (!raw) return "";
  let digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith("8")) digits = `62${digits}`;
  return digits;
}

/** Builds a wa.me URL for the given (raw) tenant phone + prefilled message. */
function waUrl(phone: string | null | undefined, message: string): string {
  const number = normalizeWaNumber(phone);
  const text = encodeURIComponent(message);
  return number
    ? `https://wa.me/${number}?text=${text}`
    : `https://wa.me/?text=${text}`;
}

/**
 * Build a WhatsApp order message from a persisted API order. API money is in
 * minor units, so divide by 100 to match the storefront's whole-rupiah display.
 * `phone` is the tenant admin's number from its branding record.
 */
export function buildWhatsAppApiOrderUrl(
  order: ApiOrderDetail,
  phone?: string | null,
): string {
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
  return waUrl(phone, lines.join("\n"));
}

export function buildWhatsAppOrderUrl(
  order: Order,
  phone?: string | null,
): string {
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
  return waUrl(phone, lines.join("\n"));
}

export const waChatUrl = (
  phone?: string | null,
  msg = "Halo Admin, saya ingin bertanya stok sandal.",
) => waUrl(phone, msg);
