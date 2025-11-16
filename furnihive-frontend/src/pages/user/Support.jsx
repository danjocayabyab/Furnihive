import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../components/contexts/AuthContext.jsx";
import toast from "react-hot-toast";
import { createSupportTicket } from "../../lib/supportApi";

const CATEGORIES = ["orders", "payments", "account", "seller", "other"];
const PRIORITIES = ["low", "normal", "high", "urgent"];

export default function UserSupport() {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("account");
  const [priority, setPriority] = useState("normal");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { user, profile } = useAuth();

  const onSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Please provide both a subject and message.");
      return;
    }
    try {
      setSubmitting(true);
      const md = user?.user_metadata || {};
      await createSupportTicket({
        userId: user?.id || null,
        type: "buyer",
        subject,
        category,
        priority,
        message,
        email: user?.email || md.email || null,
        name:
          profile?.first_name || profile?.last_name
            ? `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim()
            : md.full_name || md.name || null,
      });
      toast.success("Your support ticket has been submitted.");
      setSubject("");
      setMessage("");
      setCategory("account");
      setPriority("normal");
    } catch (e) {
      toast.error(e?.message || "Failed to submit ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-4">
      <div className="rounded-2xl border border-[var(--line-amber)] bg-white px-5 py-4 shadow-card">
        <h1 className="text-lg font-semibold text-[var(--brown-700)] mb-2">Customer Support</h1>
        <p className="text-sm text-[var(--brown-700)]/80 mb-3">
          If you have questions about your account, orders, or need help with a suspension, please send us a ticket below.
        </p>
        <p className="text-sm text-[var(--brown-700)]/80">
          You can also reach us via email at <span className="font-medium">support@furnihive.com</span>.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--line-amber)] bg-white px-5 py-4 shadow-card space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-[var(--brown-700)] mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-[var(--line-amber)] px-3 py-2 text-sm outline-none"
              placeholder="Summarize what you need help with"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--brown-700)] mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-[var(--line-amber)] px-3 py-2 text-sm outline-none capitalize"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--brown-700)] mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full rounded-lg border border-[var(--line-amber)] px-3 py-2 text-sm outline-none capitalize"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--brown-700)] mb-1">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded-lg border border-[var(--line-amber)] px-3 py-2 text-sm outline-none min-h-[140px] resize-none"
            placeholder="Describe the issue or question in as much detail as possible"
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <Link
            to="/shop"
            className="text-sm text-[var(--orange-600)] hover:underline"
          >
             Back to shopping
          </Link>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="rounded-xl bg-[var(--orange-600)] px-4 py-2.5 text-white text-sm font-medium hover:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : "Submit ticket"}
          </button>
        </div>
      </div>
    </div>
  );
}
