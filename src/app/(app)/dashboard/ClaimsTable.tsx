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
                  {canEdit && (
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button
                        className="btn sm ghost"
                        onClick={() => openEdit(claim)}
                        title="Edit claim"
                        style={{ padding: "4px 8px" }}
                      >
                        ✏️
                      </button>
                      <button
                        className="btn sm ghost"
                        onClick={() => openDelete(claim.id)}
                        title="Delete claim"
                        style={{ padding: "4px 8px", color: "var(--rose)" }}
                      >
                        🗑
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

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
