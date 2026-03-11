import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let payload: any;
  try {
    const raw = await req.text();
    payload = raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error("Failed to parse webhook body", err);
    return new Response("Bad Request", { status: 400 });
  }

  if (!payload || !payload.data) {
    console.error("Unexpected PayMongo payload", payload);
    return new Response("Bad Request", { status: 400 });
  }

  try {
    const data = payload.data;
    const attributes = data.attributes ?? {};
    const eventType: string | undefined = attributes.type || payload.type;

    // For Checkout / Payment events, PayMongo typically nests the resource in `data.attributes.data`
    const resource = attributes.data?.attributes ?? attributes;
    const metadata = resource.metadata ?? {};
    const orderId = metadata.order_id as string | number | undefined;

    if (!orderId) {
      console.warn("Webhook received without order_id metadata", payload);
      return new Response("OK", { status: 200 });
    }


    
    // Determine payment status from PayMongo event
    const payStatus: string | undefined = resource.status || attributes.status;

    let dbPaymentStatus: string | null = null;
    let dbOrderStatus: string | null = null;

    const normalizedStatus = (payStatus || "").toLowerCase();

    if (normalizedStatus === "paid" || normalizedStatus === "succeeded") {
      dbPaymentStatus = "paid";
      dbOrderStatus = "Processing";
    } else if (normalizedStatus === "cancelled") {
      dbPaymentStatus = "cancelled";
      dbOrderStatus = "Cancelled";
    } else if (normalizedStatus === "failed") {
      dbPaymentStatus = "failed";
      dbOrderStatus = "Failed";
    }

    const updates: Record<string, unknown> = {
      payment_provider: "paymongo",
      payment_metadata: payload,
    };

    if (dbPaymentStatus) {
      updates.payment_status = dbPaymentStatus;
    }
    if (dbOrderStatus) {
      updates.status = dbOrderStatus;
    }

    const { error } = await supabase
      .from("orders")
      .update(updates)
      .eq("id", orderId)
      .single();

    if (error) {
      console.error("Failed to update order from webhook", error);
      return new Response("Internal Server Error", { status: 500 });
    }

    // If payment is confirmed as paid, create seller_payouts entries and adjust inventory
    if (dbPaymentStatus === "paid") {
      try {
        const { data: items, error: itemsErr } = await supabase
          .from("order_items")
          .select("id, seller_id, product_id, qty, unit_price")
          .eq("order_id", orderId);

        if (itemsErr) {
          console.error("Failed to load order_items for payouts/inventory", itemsErr);
        } else if (items && items.length > 0) {
          const commissionRate = 0.05; // 5% platform fee
          const payoutPayload = items
            .filter((it: { seller_id: string | null }) => it.seller_id)
            .map((it: { id: string; seller_id: string; qty: number; unit_price: number }) => {
              const qty = Number(it.qty || 0);
              const unitPrice = Number(it.unit_price || 0);
              const grossAmount = qty * unitPrice;
              const platformFee = Math.round(grossAmount * commissionRate);
              const netAmount = grossAmount - platformFee;

              return {
                seller_id: it.seller_id,
                order_id: orderId,
                order_item_id: it.id,
                gross_amount: grossAmount,
                platform_fee: platformFee,
                net_amount: netAmount,
                status: "pending",
              };
            });

          if (payoutPayload.length > 0) {
            const { error: payoutErr } = await supabase
              .from("seller_payouts")
              .insert(payoutPayload);

            if (payoutErr) {
              console.error("Failed to create seller_payouts", payoutErr);
            }
          }

          const productIds = Array.from(
            new Set(
              items
                .map((it: { product_id: string | null }) => it.product_id)
                .filter((pid): pid is string => !!pid),
            ),
          );
          const sellerIds = Array.from(
            new Set(
              items
                .map((it: { seller_id: string | null }) => it.seller_id)
                .filter((sid): sid is string => !!sid),
            ),
          );

          if (productIds.length > 0 && sellerIds.length > 0) {
            const { data: inventoryRows, error: invErr } = await supabase
              .from("inventory_items")
              .select("id, seller_id, product_id, quantity_on_hand, quantity_reserved")
              .in("product_id", productIds)
              .in("seller_id", sellerIds);

            if (invErr) {
              console.error("Failed to load inventory_items for stock movements", invErr);
            } else if (inventoryRows && inventoryRows.length > 0) {
              const inventoryByKey = new Map<string, any>();
              inventoryRows.forEach((row: any) => {
                if (!row.seller_id || !row.product_id) return;
                const key = `${row.seller_id}:${row.product_id}`;
                inventoryByKey.set(key, row);
              });

              const stockMovements: any[] = [];
              const qtyByInventoryId = new Map<string, number>();

              items.forEach((it: any) => {
                if (!it.seller_id || !it.product_id) return;
                const key = `${it.seller_id}:${it.product_id}`;
                const inv = inventoryByKey.get(key);
                if (!inv) {
                  console.warn("No inventory_items row for order_item", it.id, key);
                  return;
                }
                const invId: string = inv.id;
                const qty = Number(it.qty || 0);
                if (!Number.isFinite(qty) || qty <= 0) return;

                stockMovements.push({
                  inventory_item_id: invId,
                  change_type: "order_paid",
                  quantity_change: -qty,
                  reason: "Order paid",
                  related_order_id: orderId,
                  created_by: null,
                });

                const prev = qtyByInventoryId.get(invId) || 0;
                qtyByInventoryId.set(invId, prev + qty);
              });

              if (stockMovements.length > 0) {
                const { error: smErr } = await supabase
                  .from("stock_movements")
                  .insert(stockMovements);

                if (smErr) {
                  console.error("Failed to insert stock_movements", smErr);
                }
              }

              const inventoryUpdates: { id: string; product_id: string; quantity_on_hand: number; quantity_reserved: number }[] = [];

              inventoryRows.forEach((row: any) => {
                const totalQty = qtyByInventoryId.get(row.id);
                if (!totalQty) return;
                const currentOnHand = Number(row.quantity_on_hand || 0);
                const currentReserved = Number(row.quantity_reserved || 0);
                const newOnHand = currentOnHand - totalQty;
                const newReserved = currentReserved - totalQty;
                inventoryUpdates.push({
                  id: row.id,
                  product_id: row.product_id,
                  quantity_on_hand: newOnHand,
                  quantity_reserved: newReserved,
                });
              });

              for (const u of inventoryUpdates) {
                const { error: invUpdateErr } = await supabase
                  .from("inventory_items")
                  .update({
                    quantity_on_hand: u.quantity_on_hand,
                    quantity_reserved: u.quantity_reserved,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", u.id);

                if (invUpdateErr) {
                  console.error("Failed to update inventory_items for", u.id, invUpdateErr);
                }

                // Also mirror the latest quantity_on_hand into products.stock_qty
                if (u.product_id) {
                  const { error: prodUpdateErr } = await supabase
                    .from("products")
                    .update({ stock_qty: u.quantity_on_hand })
                    .eq("id", u.product_id);

                  if (prodUpdateErr) {
                    console.error("Failed to update products.stock_qty for", u.product_id, prodUpdateErr);
                  }
                }
              }
            }
          }
        }
      } catch (payoutCatchErr) {
        console.error("Unhandled error while creating seller_payouts / stock movements", payoutCatchErr);
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Unhandled webhook error", err);
    return new Response("Internal Server Error", { status: 500 });
  }
});
