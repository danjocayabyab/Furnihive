import { supabase } from "./supabaseClient";

// Create a support ticket from buyer/seller UI.
// This is shaped to match the admin Customer Support view.
export async function createSupportTicket({
  userId,
  type, // "buyer" | "seller"
  subject,
  category,
  priority,
  message,
  email,
  name,
}) {
  if (!subject?.trim() || !message?.trim()) {
    throw new Error("Subject and message are required.");
  }

  const payload = {
    user_id: userId || null,
    type,
    subject: subject.trim(),
    category,
    priority,
    status: "open",
    message: message.trim(),
    customer_email: email || null,
    customer_name: name || null,
  };

  const { data, error } = await supabase
    .from("support_tickets")
    .insert(payload)
    .select("id, subject, category, priority, status, created_at")
    .maybeSingle();

  if (error) throw error;

  // Also persist the initial message into the support_messages thread table.
  if (data?.id && payload.message) {
    const { error: msgErr } = await supabase.from("support_messages").insert({
      ticket_id: data.id,
      author_type: type === "seller" ? "seller" : "buyer",
      body: payload.message,
    });
    if (msgErr) {
      // We don't throw here to avoid breaking ticket creation if message insert fails.
      console.warn("Failed to insert initial support message", msgErr);
    }
  }

  return data;
}
