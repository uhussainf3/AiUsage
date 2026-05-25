"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export interface ClaimRow {
  id: string;
  jiraTicketId: string | null;
  jiraTicketUrl: string | null;
  estimatedWithout: number;
  estimatedWith: number;
  hoursSaved: number;
  approvedHours: number | null;
  toolsUsed: string; // JSON string
  claimType: string;
  description: string;
  status: string;
  rejectReason: string | null;
  approverNote: string | null;
  createdAt: string; // ISO string — serialized from Date on the server
  submitterId: string;
  projectId: string | null;
  projectName: string | null;
}

export interface ProjectOption {
  id: string;
  name: string;
  jiraProjectKey: string | null;
}

const TOOLS = [
  { id: "claude", label: "Claude Code" },
  { id: "play", label: "Playwright MCP" },
  { id: "netsuite", label: "NetSuite MCP" },
  { id: "design", label: "Design AI" },
  { id: "custom", label: "Other AI" },
];

const CLAIM_TYPES = [
  { value: "TEST_AUTOMATION", label: "Test Automation" },
  { value: "BUG_DETECTION", label: "Bug Detection" },
  { value: "REGRESSION", label: "Regression Testing" },
  { value: "CI_CD", label: "CI/CD Pipeline" },
  { value: "CODE_REVIEW", label: "Code Review" },
  { value: "OTHER", label: "Other" },
];

function statusChip(status: string) {
  const map: Record<string, string> = {
    APPROVED: "approved",
    PENDING: "pending",
    CORROBORATED: "corroborated",
    REDUCED: "reduced",
    REJECTED: "rejected",
  };
  const labelMap: Record<string, string> = {
    APPROVED: "Approved",
    PENDING: "Pending",
    CORROBORATED: "Corroborated",
    REDUCED: "Reduced",
    REJECTED: "Rejected",
  };
  return { cls: map[status] ?? "neutral", label: labelMap[status] ?? status };
}

function parseTools(raw: string): string[] {
  try { return JSON.parse(raw); } catch { return []; }
}

function toolLabel(t: string) {
  if (t === "claude") return "Claude";
  if (t === "play") return "Playwright";
  if (t === "netsuite") return "NetSuite";
  if (t === "design") return "Design AI";
  return t;
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  zIndex: 999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};

const modalStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 12,
  padding: "28px 32px",
  width: "100%",
  maxWidth: 560,
  maxHeight: "90vh",
  overflowY: "auto",
  boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
};

export function ClaimsTable({
  initialClaims,
  currentUserId,
  projects = [],
}: {
  initialClaims: ClaimRow[];
  currentUserId: string;
  projects?: ProjectOption[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [claims, setClaims] = useState<ClaimRow[]>(initialClaims);

  /* ── View state ── */
  const [viewingClaim, setViewingClaim] = useState<ClaimRow | null>(null);

  /* ── Edit state ── */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTools, setEditTools] = useState<string[]>([]);
  const [editClaimType, setEditClaimType] = useState("TEST_AUTOMATION");
  const [editWithout, setEditWithout] = useState("");
  const [editWith, setEditWith] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editProjectId, setEditProjectId] = useState<string>("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  /* ── Delete state ── */
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  /* ── Edit handlers ── */
  function openEdit(claim: ClaimRow) {
    setEditingId(claim.id);
    setEditTools(parseTools(claim.toolsUsed));
    setEditClaimType(claim.claimType);
    setEditWithout(String(claim.estimatedWithout));
    setEditWith(String(claim.estimatedWith));
    setEditDescription(claim.description);
    setEditProjectId(claim.projectId ?? "");
    setEditError("");
  }

  function closeEdit() {
    setEditingId(null);
    setEditError("");
  }

  function openView(claim: ClaimRow) { setViewingClaim(claim); }
  function closeView() { setViewingClaim(null); }
  function viewThenEdit(claim: ClaimRow) {
    closeView();
    openEdit(claim);
  }

  function toggleEditTool(id: string) {
    setEditTools((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSave() {
    if (!editingId) return;
    setEditSaving(true);
    setEditError("");
    const hoursSaved = Math.max(0, Number(editWithout) - Number(editWith));
    try {
      const res = await fetch(`/api/claims/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimatedWithout: Number(editWithout),
          estimatedWith: Number(editWith),
          hoursSaved,
          toolsUsed: editTools,
          claimType: editClaimType,
          description: editDescription,
          projectId: editProjectId || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setEditError(d.error ?? "Failed to save. Please try again.");
      } else {
        const updated = await res.json();
        const newProjectName =
          editProjectId
            ? (projects.find((p) => p.id === editProjectId)?.name ?? null)
            : null;
        setClaims((prev) =>
          prev.map((c) =>
            c.id === editingId
              ? {
                  ...c,
                  estimatedWithout: updated.estimatedWithout,
                  estimatedWith: updated.estimatedWith,
                  hoursSaved: updated.hoursSaved,
                  toolsUsed: updated.toolsUsed,
                  claimType: updated.claimType,
                  description: updated.description,
                  status: updated.status,
                  rejectReason: updated.rejectReason,
                  projectId: editProjectId || null,
                  projectName: newProjectName,
                }
              : c
          )
        );
        closeEdit();
        startTransition(() => router.refresh());
      }
    } catch {
      setEditError("Network error. Please try again.");
    } finally {
      setEditSaving(false);
    }
  }

  /* ── Delete handlers ── */
  function openDelete(id: string) {
    setDeletingId(id);
    setDeleteError("");
  }

  function closeDelete() {
    setDeletingId(null);
    setDeleteError("");
  }

  async function handleDelete() {
    if (!deletingId) return;
    setDeleteInProgress(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/claims/${deletingId}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        setDeleteError(d.error ?? "Failed to delete. Please try again.");
      } else {
        setClaims((prev) => prev.filter((c) => c.id !== deletingId));
        closeDelete();
        startTransition(() => router.refresh());
      }
    } catch {
      setDeleteError("Network error. Please try again.");
    } finally {
      setDeleteInProgress(false);
    }
  }

  const editHoursSaved = Math.max(0, Number(editWithout) - Number(editWith));

  /* ── Empty state ── */
  if (claims.length === 0) {
    return (
      <div className="empty-state">
        <div style={{ fontSize: 32 }}>📋</div>
        <p>No claims yet. Submit your first AI productivity win!</p>
        <a
          href="/submit"
          className="btn primary"
          style={{ marginTop: 16, display: "inline-flex" }}
        >
          Submit First Claim
        </a>
      </div>
    );
  }

  return (
    <>
      <table className="tbl">
        <thead>
          <tr>
            <th>Ticket</th>
            <th>Project</th>
            <th>Tools</th>
            <th>Hours Saved</th>
            <th>Status</th>
            <th>Date</th>
            <th style={{ width: 88 }}></th>
          </tr>
        </thead>
        <tbody>
          {claims.map((claim) => {
            const { cls, label } = statusChip(claim.status);
            const tools = parseTools(claim.toolsUsed);
            const canEdit =
              ["PENDING", "CORROBORATED", "REJECTED"].includes(claim.status) &&
              claim.submitterId === currentUserId;
            const canDelete =
              claim.status === "PENDING" && claim.submitterId === currentUserId;

            return (
              <tr key={claim.id}>
                <td>
                  {claim.jiraTicketUrl ? (
                    <a
                      href={claim.jiraTicketUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ticket"
                    >
                      {claim.jiraTicketId ?? "—"}
                    </a>
                  ) : (
                    <span style={{ color: "var(--muted)", fontFamily: "var(--mono)", fontSize: 12 }}>
                      {claim.jiraTicketId ?? "No ticket"}
                    </span>
                  )}
                </td>
                <td>
                  {claim.projectName ? (
                    <span style={{
                      fontSize: 12, fontWeight: 500, color: "var(--ink-2)",
                      background: "var(--blue-soft)", borderRadius: 4,
                      padding: "2px 7px", whiteSpace: "nowrap",
                    }}>
                      {claim.projectName}
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--muted-2)" }}>—</span>
                  )}
                </td>
                <td>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {tools.map((t) => (
                      <span key={t} className="tool-chip">
                        <span className={`sw ${t}`} />
                        {toolLabel(t)}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  <div className="hours-cell">
                    <span className="saved">
                      +{(claim.approvedHours ?? claim.hoursSaved).toFixed(1)}h
                    </span>
                    <span className="sub">
                      {claim.estimatedWithout}h → {claim.estimatedWith}h
                    </span>
                  </div>
                </td>
                <td>
                  <span className={`chip ${cls}`}>
                    <span className="bullet" />
                    {label}
                  </span>
                </td>
                <td className="muted nowrap">
                  {new Date(claim.createdAt).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                  })}
                </td>
                <td>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <button
                      className="btn sm ghost"
                      onClick={() => openView(claim)}
                      title="View details"
                      style={{ padding: "4px 8px" }}
                    >
                      👁
                    </button>
                    {canEdit && (
                      <button
                        className="btn sm ghost"
                        onClick={() => openEdit(claim)}
                        title="Edit claim"
                        style={{ padding: "4px 8px" }}
                      >
                        ✏️
                      </button>
                    )}
                    {canDelete && (
                      <button
                        className="btn sm ghost"
                        onClick={() => openDelete(claim.id)}
                        title="Delete claim"
                        style={{ padding: "4px 8px", color: "var(--rose)" }}
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ── View modal ── */}
      {viewingClaim && (() => {
        const c = viewingClaim;
        const { cls, label } = statusChip(c.status);
        const tools = parseTools(c.toolsUsed);
        const claimTypeLabel = CLAIM_TYPES.find((t) => t.value === c.claimType)?.label ?? c.claimType;
        const canEditThis = ["PENDING", "CORROBORATED", "REJECTED"].includes(c.status) && c.submitterId === currentUserId;
        const isRejectedOwned = c.status === "REJECTED" && c.submitterId === currentUserId;
        const canDeleteThis = c.status === "PENDING" && c.submitterId === currentUserId;
        return (
          <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && closeView()}>
            <div style={{ ...modalStyle, maxWidth: 600 }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  {c.jiraTicketUrl ? (
                    <a href={c.jiraTicketUrl} target="_blank" rel="noopener noreferrer" className="ticket" style={{ fontSize: 13 }}>
                      {c.jiraTicketId ?? "No ticket"}
                    </a>
                  ) : (
                    <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--muted)" }}>{c.jiraTicketId ?? "No ticket"}</span>
                  )}
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
                    <span className={`chip ${cls}`}><span className="bullet" />{label}</span>
                    {c.projectName && (
                      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--blue)", background: "var(--blue-soft)", borderRadius: 4, padding: "2px 8px" }}>
                        📁 {c.projectName}
                      </span>
                    )}
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>
                      🕐 {new Date(c.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
                <button onClick={closeView} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--muted)", lineHeight: 1, flexShrink: 0 }}>✕</button>
              </div>

              {/* Tools & Type */}
              <div style={{ display: "flex", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>AI Tools</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {tools.map((t) => (
                      <span key={t} className="tool-chip"><span className={`sw ${t}`} />{toolLabel(t)}</span>
                    ))}
                    {tools.length === 0 && <span style={{ color: "var(--muted)", fontSize: 13 }}>—</span>}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Claim Type</div>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{claimTypeLabel}</span>
                </div>
              </div>

              {/* Hours grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 18 }}>
                {[
                  { label: "Without AI", value: `${c.estimatedWithout}h`, color: "" },
                  { label: "With AI", value: `${c.estimatedWith}h`, color: "" },
                  { label: "Hours Saved", value: `+${c.hoursSaved.toFixed(1)}h`, color: "var(--green)" },
                  ...(c.approvedHours != null ? [{ label: "Approved", value: `${c.approvedHours}h`, color: "var(--blue)" }] : []),
                ].map((box) => (
                  <div key={box.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>{box.label}</div>
                    <div style={{ fontFamily: "var(--mono)", fontWeight: 700, fontSize: 16, color: box.color || "var(--ink)" }}>{box.value}</div>
                  </div>
                ))}
              </div>

              {/* Description */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Description</div>
                <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7, margin: 0, background: "var(--surface)", borderRadius: 8, padding: "12px 14px", border: "1px solid var(--border)" }}>
                  {c.description}
                </p>
              </div>

              {/* Approver note */}
              {(c.status === "APPROVED" || c.status === "REDUCED") && c.approverNote && (
                <div style={{ marginBottom: 18, background: "var(--blue-soft)", border: "1px solid var(--blue)", borderRadius: 8, padding: "12px 14px" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--blue)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Note from reviewer</div>
                  <p style={{ fontSize: 13, color: "var(--ink-2)", margin: 0, lineHeight: 1.6 }}>{c.approverNote}</p>
                </div>
              )}

              {/* Reject reason */}
              {c.rejectReason && (
                <div style={{ marginBottom: 18, background: "var(--rose-soft)", border: "1px solid var(--rose)", borderRadius: 8, padding: "12px 14px" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--rose)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Rejection Reason</div>
                  <p style={{ fontSize: 13, color: "var(--ink-2)", margin: 0, lineHeight: 1.6 }}>{c.rejectReason}</p>
                </div>
              )}

              {/* Footer actions */}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                {canDeleteThis && (
                  <button className="btn ghost" style={{ color: "var(--rose)" }}
                    onClick={() => { closeView(); openDelete(c.id); }}>
                    🗑 Delete
                  </button>
                )}
                <button className="btn ghost" onClick={closeView}>Close</button>
                {isRejectedOwned && (
                  <button className="btn primary" onClick={() => viewThenEdit(c)}>
                    ✏️ Edit &amp; Resubmit
                  </button>
                )}
                {canEditThis && !isRejectedOwned && (
                  <button className="btn primary" onClick={() => viewThenEdit(c)}>
                    ✏️ Edit Claim
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Edit modal ── */}
      {editingId && (
        <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && closeEdit()}>
          <div style={modalStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Edit Claim</h2>
              <button
                onClick={closeEdit}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--muted)", lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            {/* Tools */}
            <div className="field" style={{ marginBottom: 18 }}>
              <label style={{ display: "block", marginBottom: 8 }}>AI Tools Used</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {TOOLS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleEditTool(t.id)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 6,
                      border: "1.5px solid",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 500,
                      transition: "all 0.1s",
                      background: editTools.includes(t.id) ? "var(--red-soft)" : "var(--surface)",
                      borderColor: editTools.includes(t.id) ? "var(--red)" : "var(--border)",
                      color: editTools.includes(t.id) ? "var(--red-700)" : "var(--ink)",
                    }}
                  >
                    {t.label}
                    {editTools.includes(t.id) && " ✓"}
                  </button>
                ))}
              </div>
              {editTools.length === 0 && (
                <p style={{ fontSize: 12, color: "var(--rose)", marginTop: 6 }}>
                  Select at least one tool.
                </p>
              )}
            </div>

            {/* Claim type */}
            <div className="field" style={{ marginBottom: 18 }}>
              <label style={{ display: "block", marginBottom: 6 }}>Claim Type</label>
              <select
                className="select"
                value={editClaimType}
                onChange={(e) => setEditClaimType(e.target.value)}
              >
                {CLAIM_TYPES.map((ct) => (
                  <option key={ct.value} value={ct.value}>
                    {ct.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Hours grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 18 }}>
              <div className="field">
                <label style={{ display: "block", marginBottom: 6 }}>Without AI (hrs)</label>
                <input
                  className="input mono"
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={editWithout}
                  onChange={(e) => setEditWithout(e.target.value)}
                />
              </div>
              <div className="field">
                <label style={{ display: "block", marginBottom: 6 }}>With AI (hrs)</label>
                <input
                  className="input mono"
                  type="number"
                  min="0"
                  step="0.5"
                  value={editWith}
                  onChange={(e) => setEditWith(e.target.value)}
                />
              </div>
              <div className="field">
                <label style={{ display: "block", marginBottom: 6 }}>Hours Saved</label>
                <div
                  className="input mono"
                  style={{
                    background: "var(--green-soft)",
                    border: "1px solid var(--green)",
                    color: "var(--green)",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {editHoursSaved > 0 ? `+${editHoursSaved.toFixed(1)}h` : "—"}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="field" style={{ marginBottom: 18 }}>
              <label style={{ display: "block", marginBottom: 6 }}>
                Description
                <span style={{ fontWeight: 400, color: "var(--muted)", marginLeft: 6, fontSize: 12 }}>
                  (min 10 chars)
                </span>
              </label>
              <textarea
                className="textarea"
                rows={4}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                style={{ minHeight: 90, resize: "vertical" }}
                placeholder="Describe what you achieved with AI assistance…"
              />
              <span style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, display: "block" }}>
                {editDescription.length} chars
              </span>
            </div>

            {/* Project */}
            {projects.length > 0 && (
              <div className="field" style={{ marginBottom: 18 }}>
                <label style={{ display: "block", marginBottom: 6 }}>
                  Project
                  <span style={{ fontWeight: 400, color: "var(--muted)", marginLeft: 6, fontSize: 12 }}>(optional)</span>
                </label>
                <select
                  className="select"
                  value={editProjectId}
                  onChange={(e) => setEditProjectId(e.target.value)}
                >
                  <option value="">— Unassigned —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.jiraProjectKey ? ` (${p.jiraProjectKey})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {editError && (
              <div
                style={{
                  color: "var(--rose)",
                  fontSize: 13,
                  padding: "10px 14px",
                  background: "var(--rose-soft)",
                  borderRadius: 6,
                  marginBottom: 16,
                }}
              >
                {editError}
              </div>
            )}

            {claims.find((c) => c.id === editingId)?.status === "REJECTED" && (
              <div style={{
                fontSize: 13,
                padding: "10px 14px",
                background: "var(--blue-soft)",
                border: "1px solid var(--blue)",
                borderRadius: 6,
                marginBottom: 16,
                color: "var(--blue)",
              }}>
                Saving will resubmit this claim for review.
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn ghost" onClick={closeEdit} disabled={editSaving}>
                Cancel
              </button>
              <button
                className="btn primary"
                onClick={handleSave}
                disabled={
                  editSaving ||
                  editTools.length === 0 ||
                  !editWithout ||
                  !editWith ||
                  editDescription.trim().length < 10
                }
              >
                {editSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm modal ── */}
      {deletingId && (
        <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && !deleteInProgress && closeDelete()}>
          <div style={{ ...modalStyle, maxWidth: 400, textAlign: "center" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🗑️</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Delete this claim?</h2>
            <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
              This will permanently remove the claim and cannot be undone.
            </p>

            {deleteError && (
              <div
                style={{
                  color: "var(--rose)",
                  fontSize: 13,
                  padding: "10px 14px",
                  background: "var(--rose-soft)",
                  borderRadius: 6,
                  marginBottom: 16,
                  textAlign: "left",
                }}
              >
                {deleteError}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                className="btn ghost"
                onClick={closeDelete}
                disabled={deleteInProgress}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteInProgress}
                style={{
                  padding: "8px 20px",
                  borderRadius: 6,
                  border: "none",
                  background: "var(--rose)",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: deleteInProgress ? "not-allowed" : "pointer",
                  opacity: deleteInProgress ? 0.7 : 1,
                }}
              >
                {deleteInProgress ? "Deleting…" : "Yes, delete it"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
