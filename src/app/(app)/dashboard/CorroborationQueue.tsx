"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export interface CorroborationClaim {
  id: string;
  jiraTicketId: string | null;
  jiraSummary: string | null;
  hoursSaved: number;
  description: string;
  submitter: { name: string | null; email: string | null };
  project: { name: string } | null;
  createdAt: string; // ISO string
}

export function CorroborationQueue({ claims }: { claims: CorroborationClaim[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [queue, setQueue] = useState<CorroborationClaim[]>(claims);
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (queue.length === 0) return null;

  function openPanel(id: string) {
    setOpenId(id);
    setNote("");
    setError("");
  }

  function closePanel() {
    setOpenId(null);
    setNote("");
    setError("");
  }

  async function handleAction(id: string, action: "confirm" | "decline") {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/claims/${id}/corroborate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: action === "confirm" ? note : undefined }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Something went wrong. Please try again.");
        return;
      }
      // Remove from local queue and refresh server data
      setQueue((prev) => prev.filter((c) => c.id !== id));
      setOpenId(null);
      startTransition(() => router.refresh());
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div className="card-head">
        <div className="card-title">
          👥 Pending My Corroboration
          <span className="count">{queue.length}</span>
        </div>
      </div>

      <div>
        {queue.map((claim) => {
          const isOpen = openId === claim.id;
          const submitterName =
            claim.submitter.name ?? claim.submitter.email?.split("@")[0] ?? "Unknown";
          const dateStr = new Date(claim.createdAt).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
          });
          const summary = claim.jiraSummary
            ? claim.jiraSummary.length > 60
              ? claim.jiraSummary.slice(0, 60) + "…"
              : claim.jiraSummary
            : null;

          return (
            <div key={claim.id}>
              {/* Claim row */}
              <div
                onClick={() => (isOpen ? closePanel() : openPanel(claim.id))}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "12px 20px",
                  borderTop: "1px solid var(--border)",
                  cursor: "pointer",
                  transition: "background 0.1s",
                  background: isOpen ? "var(--surface)" : undefined,
                }}
                onMouseEnter={(e) => {
                  if (!isOpen) (e.currentTarget as HTMLDivElement).style.background = "var(--surface)";
                }}
                onMouseLeave={(e) => {
                  if (!isOpen) (e.currentTarget as HTMLDivElement).style.background = "";
                }}
              >
                {/* Ticket */}
                <span
                  className="ticket"
                  style={{ flexShrink: 0, fontSize: 12 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {claim.jiraTicketId ?? "—"}
                </span>

                {/* Submitter */}
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", minWidth: 100 }}>
                  {submitterName}
                </span>

                {/* Hours saved */}
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--green)",
                    flexShrink: 0,
                  }}
                >
                  +{claim.hoursSaved.toFixed(1)}h
                </span>

                {/* Summary */}
                {summary && (
                  <span
                    style={{
                      flex: 1,
                      fontSize: 12,
                      color: "var(--muted)",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {summary}
                  </span>
                )}

                {/* Project */}
                {claim.project && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: "var(--blue)",
                      background: "var(--blue-soft)",
                      borderRadius: 4,
                      padding: "2px 7px",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    {claim.project.name}
                  </span>
                )}

                {/* Date */}
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--muted)",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {dateStr}
                </span>

                {/* Chevron */}
                <span style={{ color: "var(--muted)", fontSize: 12, flexShrink: 0 }}>
                  {isOpen ? "▲" : "▼"}
                </span>
              </div>

              {/* Inline confirmation panel */}
              {isOpen && (
                <div
                  style={{
                    padding: "16px 20px 20px",
                    background: "var(--surface)",
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  {/* Description */}
                  <div style={{ marginBottom: 14 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: 6,
                      }}
                    >
                      Description
                    </div>
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--ink)",
                        lineHeight: 1.65,
                        margin: 0,
                        background: "#fff",
                        borderRadius: 6,
                        padding: "10px 14px",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {claim.description}
                    </p>
                  </div>

                  {/* Hours saved */}
                  <div style={{ marginBottom: 14 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: 6,
                      }}
                    >
                      Hours Saved
                    </div>
                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 20,
                        fontWeight: 700,
                        color: "var(--green)",
                      }}
                    >
                      +{claim.hoursSaved.toFixed(1)}h
                    </span>
                  </div>

                  {/* Note textarea */}
                  <div style={{ marginBottom: 14 }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: 6,
                      }}
                    >
                      Note (optional)
                    </label>
                    <textarea
                      className="textarea"
                      rows={2}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Add a note for the submitter…"
                      disabled={loading}
                      style={{ resize: "vertical", minHeight: 64 }}
                    />
                  </div>

                  {/* Error message */}
                  {error && (
                    <div
                      style={{
                        color: "var(--rose)",
                        fontSize: 13,
                        padding: "8px 12px",
                        background: "var(--rose-soft)",
                        borderRadius: 6,
                        marginBottom: 12,
                      }}
                    >
                      {error}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      className="btn"
                      disabled={loading}
                      onClick={() => handleAction(claim.id, "confirm")}
                      style={{
                        background: "var(--green)",
                        color: "#fff",
                        border: "none",
                        fontWeight: 600,
                        opacity: loading ? 0.7 : 1,
                        cursor: loading ? "not-allowed" : "pointer",
                      }}
                    >
                      {loading ? "Saving…" : "✓ Confirm — I witnessed this"}
                    </button>
                    <button
                      className="btn ghost"
                      disabled={loading}
                      onClick={() => handleAction(claim.id, "decline")}
                      style={{
                        color: "var(--muted)",
                        opacity: loading ? 0.7 : 1,
                        cursor: loading ? "not-allowed" : "pointer",
                      }}
                    >
                      ✕ I didn&apos;t witness this
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
