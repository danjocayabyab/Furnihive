// src/admin/ApplicationModal.jsx
import { supabase } from "../lib/supabaseClient";

export default function ApplicationModal({
  open,
  onClose,
  data,
  onApprove,
  onReject,
}) {
  if (!open || !data) return null;

  const Line = () => <hr className="my-4 border-[var(--line-amber)]/50" />;

  const Label = ({ children }) => (
    <div className="text-[12px] uppercase tracking-wide text-[var(--brown-700)]/70 mb-1">
      {children}
    </div>
  );

  const Field = ({ children }) => (
    <div className="flex items-start gap-2">
      <div>{children}</div>
    </div>
  );

  const Pill = ({ children, tone = "pending" }) => {
    const map = {
      pending: "bg-yellow-100 text-amber-900 border-yellow-200",
      reviewing: "bg-gray-100 text-gray-600 border-gray-200",
      approved: "bg-green-100 text-green-700 border-green-200",
      rejected: "bg-red-100 text-red-700 border-red-200",
    };
    return (
      <span className={`px-2 py-0.5 text-xs rounded-full border ${map[tone]}`}>
        {children}
      </span>
    );
  };

  const DocItem = ({ doc }) => {
    const name = typeof doc === "string" ? doc : doc.name || "Document";
    const path = typeof doc === "string" ? null : doc.path || null;

    let url = null;
    if (path) {
      const { data: pub } = supabase.storage
        .from("store-verifications")
        .getPublicUrl(path);
      url = pub?.publicUrl || null;
    }

    const handleOpen = () => {
      if (!url) return;
      window.open(url, "_blank", "noopener,noreferrer");
    };

    return (
      <button
        type="button"
        onClick={handleOpen}
        disabled={!url}
        className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-left ${
          url
            ? "border-[var(--line-amber)] bg-white hover:bg-[var(--cream-50)] cursor-pointer"
            : "border-gray-200 bg-gray-50 cursor-default"
        }`}
      >
        <div className="flex items-center gap-2 text-[var(--brown-700)]">
          <span className="text-sm truncate max-w-[220px]">{name}</span>
        </div>
        {url && (
          <span className="px-2 py-0.5 text-xs rounded-full border bg-green-100 text-green-700 border-green-200">
            View
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      {/* Dialog */}
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-card border border-[var(--line-amber)]">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur px-5 py-3 border-b border-[var(--line-amber)]">
            <div className="font-semibold text-[var(--brown-700)]">
              {data.companyName}
            </div>
          </div>

          {/* Body */}
          <div className="px-5 py-4">
            {/* Email + Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Field>
                  <div className="text-[var(--brown-700)]">
                    {data.email || "—"}
                  </div>
                </Field>
              </div>
              <div>
                <Label>Phone</Label>
                <Field>
                  <div className="text-[var(--brown-700)]">
                    {data.phone || "—"}
                  </div>
                </Field>
              </div>
            </div>

            <Line />

            {/* Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Location</Label>
                <Field>
                  <div className="text-[var(--brown-700)]">
                    {data.location || "—"}
                  </div>
                </Field>
              </div>
            </div>

            <Line />

            {/* Application details */}
            <div className="flex items-center justify-between">
              <div className="font-semibold text-[var(--brown-700)]">
                Application Details
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Submitted Date</Label>
                <div className="text-[var(--brown-700)]">
                  {data.submittedAt || "—"}
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <Pill tone={data.status}>{data.status || "—"}</Pill>
              </div>
            </div>

            <div className="mt-4">
              <Label>Note</Label>
              <p className="text-[var(--brown-700)]/90 leading-relaxed text-sm">
                {data.description ||
                  "No description provided. This section will include a short overview of the business and product lines."}
              </p>
            </div>

            <Line />

            {/* Documents */}
            <div>
              <Label>Submitted Documents</Label>
              <div className="mt-2 space-y-2">
                {data.documents?.length ? (
                  data.documents.map((d, i) => <DocItem key={i} doc={d} />)
                ) : (
                  <p className="text-sm text-[var(--brown-700)]/70">
                    No documents were submitted.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white/95 backdrop-blur px-5 py-3 border-t border-[var(--line-amber)] flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="h-9 px-3 rounded-lg border border-[var(--line-amber)] bg-white hover:bg-[var(--cream-50)]"
            >
              Close
            </button>
            <button
              onClick={onReject}
              className="h-9 px-3 rounded-lg border border-red-300 bg-white text-red-600 hover:bg-red-50"
            >
              Reject Application
            </button>
            <button
              onClick={onApprove}
              className="h-9 px-3 rounded-lg border border-[var(--line-amber)] bg-[var(--orange-600)] text-white hover:opacity-95"
            >
              Approve Application
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
