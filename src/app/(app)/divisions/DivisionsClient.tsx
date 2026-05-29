"use client";

import { useState } from "react";
import { fmtHours } from "@/lib/format";

interface HeadUser {
  id: string;
  name: string | null;
  email: string | null;
}

interface DivisionStat {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  head: HeadUser | null;
  projectCount: number;
  approvedClaimCount: number;
  totalHoursSaved: number;
  createdAt: string;
}

interface HeadCandidate {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
}

function getInitials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarClass(email?: string | null) {
  if (!email) return "";
  const n = email.charCodeAt(0) % 9;
  return n > 0 ? `a-${n + 1}` : "";
}

function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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
  maxWidth: 480,
  boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
};

export function DivisionsClient({
  divisions,
  headCandidates,
  currentUserRole,
}: {
  divisions: DivisionStat[];
  headCandidates: HeadCandidate[];
  currentUserRole: string;
}) {
  const isAdmin = currentUserRole === "ADMIN";

  // Local state so updates don't need a full reload
  const [localDivisions, setLocalDivisions] = useState(divisions);

  // Edit modal state
  const [editDivision, setEditDivision] = useState<DivisionStat | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editHeadId, setEditHeadId] = useState("");
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState("");

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newHeadId, setNewHeadId] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  function openEdit(d: DivisionStat) {
    setEditDivision(d);
    setEditName(d.name);
    setEditDesc(d.description ?? "");
    setEditHeadId(d.head?.id ?? "");
    setEditError("");
  }

  async function handleEdit() {
    if (!editDivision) return;
    setEditing(true);
    setEditError("");
    try {
      const res = await fetch(`/api/divisions/${editDivision.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDesc.trim() || null,
          headId: editHeadId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error ?? "Failed to update division.");
        return;
      }
      const newHead = headCandidates.find((u) => u.id === editHeadId) ?? null;
      setLocalDivisions((prev) =>
        prev.map((d) =>
          d.id === editDivision.id
            ? {
                ...d,
                name: editName.trim(),
                description: editDesc.trim() || null,
                head: newHead
                  ? { id: newHead.id, name: newHead.name, email: newHead.email }
                  : null,
              }
            : d
        )
      );
      setEditDivision(null);
    } catch {
      setEditError("Network error. Please try again.");
    } finally {
      setEditing(false);
    }
  }

  function handleNewNameChange(val: string) {
    setNewName(val);
    setNewSlug(slugify(val));
  }

  async function handleCreate() {
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/divisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          slug: newSlug.trim(),
          description: newDesc.trim() || undefined,
          headId: newHeadId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error ?? "Failed to create division.");
        return;
      }
      const newHead = headCandidates.find((u) => u.id === newHeadId) ?? null;
      const created: DivisionStat = {
        id: data.id,
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        head: newHead
          ? { id: newHead.id, name: newHead.name, email: newHead.email }
          : null,
        projectCount: 0,
        approvedClaimCount: 0,
        totalHoursSaved: 0,
        createdAt: data.createdAt,
      };
      setLocalDivisions((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
      );
      setShowCreate(false);
      setNewName("");
      setNewSlug("");
      setNewDesc("");
      setNewHeadId("");
    } catch {
      setCreateError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="page-head">
        <div>
          <h1>Divisions</h1>
          <p className="sub">
            Org chart view — see which division leads each practice area and its AI impact.
          </p>
        </div>
        <div className="head-actions">
          {isAdmin && (
            <button className="btn primary" onClick={() => setShowCreate(true)}>
              + New Division
            </button>
          )}
        </div>
      </div>

      {/* Summary bar */}
      <div
        style={{
          display: "flex",
          gap: 0,
          background: "#fff",
          border: "1px solid var(--border)",
          borderRadius: 10,
          marginBottom: 28,
          overflow: "hidden",
        }}
      >
        {[
          { label: "Divisions", value: localDivisions.length },
          {
            label: "Total Projects",
            value: localDivisions.reduce((s, d) => s + d.projectCount, 0),
          },
          {
            label: "Approved Claims",
            value: localDivisions.reduce((s, d) => s + d.approvedClaimCount, 0),
          },
          {
            label: "Hours Saved",
            value: fmtHours(
              localDivisions.reduce((s, d) => s + d.totalHoursSaved, 0)
            ),
          },
        ].map((stat, i, arr) => (
          <div
            key={stat.label}
            style={{
              flex: 1,
              padding: "16px 24px",
              borderRight: i < arr.length - 1 ? "1px solid var(--border)" : "none",
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "var(--ink)",
                letterSpacing: "-0.02em",
              }}
            >
              {stat.value}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Divisions grid */}
      {localDivisions.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 40 }}>
          <div style={{ fontSize: 40 }}>🏢</div>
          <p>No divisions yet.</p>
          {isAdmin && (
            <button
              className="btn primary"
              style={{ marginTop: 16 }}
              onClick={() => setShowCreate(true)}
            >
              Create First Division
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {localDivisions.map((d) => (
            <div key={d.id} className="card" style={{ padding: "22px 24px" }}>
              {/* Card header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 14,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: "var(--ink)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {d.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--muted)",
                      fontFamily: "var(--mono)",
                      marginTop: 2,
                    }}
                  >
                    /{d.slug}
                  </div>
                  {d.description && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--ink-2)",
                        marginTop: 6,
                        lineHeight: 1.5,
                      }}
                    >
                      {d.description}
                    </div>
                  )}
                </div>
                {isAdmin && (
                  <button
                    className="btn sm ghost"
                    onClick={() => openEdit(d)}
                    style={{ flexShrink: 0, marginLeft: 12 }}
                  >
                    Edit
                  </button>
                )}
              </div>

              {/* Division head */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  background: "var(--surface)",
                  borderRadius: 8,
                  marginBottom: 14,
                }}
              >
                {d.head ? (
                  <>
                    <div
                      className={`avatar sm ${getAvatarClass(d.head.email)}`}
                    >
                      {getInitials(d.head.name)}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--ink)",
                        }}
                      >
                        {d.head.name ?? d.head.email?.split("@")[0]}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>
                        Division Head
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className="avatar sm"
                      style={{ background: "var(--border)", color: "var(--muted)" }}
                    >
                      ?
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>
                      Unassigned
                    </div>
                  </>
                )}
              </div>

              {/* Stats */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 8,
                }}
              >
                {[
                  { label: "Projects", value: d.projectCount, color: "var(--ink)" },
                  {
                    label: "Approved",
                    value: d.approvedClaimCount,
                    color: "var(--green)",
                  },
                  {
                    label: "Hours Saved",
                    value: fmtHours(d.totalHoursSaved),
                    color: "var(--green)",
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    style={{
                      background: "var(--surface)",
                      borderRadius: 6,
                      padding: "8px 10px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: stat.color,
                      }}
                    >
                      {stat.value}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 1 }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editDivision && (
        <div
          style={overlayStyle}
          onClick={(e) => e.target === e.currentTarget && setEditDivision(null)}
        >
          <div style={modalStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Edit Division</h2>
              <button
                onClick={() => setEditDivision(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 20,
                  color: "var(--muted)",
                }}
              >
                ✕
              </button>
            </div>

            <div className="field" style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 6 }}>
                Division Name *
              </label>
              <input
                className="input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="field" style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 6 }}>
                Description
                <span
                  style={{
                    fontWeight: 400,
                    color: "var(--muted)",
                    marginLeft: 6,
                    fontSize: 12,
                  }}
                >
                  (optional)
                </span>
              </label>
              <textarea
                className="textarea"
                rows={2}
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
              />
            </div>

            <div className="field" style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 6 }}>
                Division Head
                <span
                  style={{
                    fontWeight: 400,
                    color: "var(--muted)",
                    marginLeft: 6,
                    fontSize: 12,
                  }}
                >
                  (optional)
                </span>
              </label>
              <select
                className="select"
                value={editHeadId}
                onChange={(e) => setEditHeadId(e.target.value)}
              >
                <option value="">— Unassigned —</option>
                {headCandidates.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name ?? u.email?.split("@")[0]} —{" "}
                    {u.role.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
              <span className="help">
                Only users with the DIVISION_HEAD or ADMIN role are shown.
              </span>
            </div>

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
              <button
                className="btn ghost"
                onClick={() => setEditDivision(null)}
                disabled={editing}
              >
                Cancel
              </button>
              <button
                className="btn primary"
                onClick={handleEdit}
                disabled={editing || editName.trim().length < 2}
              >
                {editing ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div
          style={overlayStyle}
          onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}
        >
          <div style={modalStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>New Division</h2>
              <button
                onClick={() => setShowCreate(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 20,
                  color: "var(--muted)",
                }}
              >
                ✕
              </button>
            </div>

            <div className="field" style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 6 }}>
                Division Name *
              </label>
              <input
                className="input"
                placeholder="e.g. NetSuite"
                value={newName}
                onChange={(e) => handleNewNameChange(e.target.value)}
                autoFocus
              />
            </div>

            <div className="field" style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 6 }}>
                Slug *
                <span
                  style={{
                    fontWeight: 400,
                    color: "var(--muted)",
                    marginLeft: 6,
                    fontSize: 12,
                  }}
                >
                  (auto-generated from name)
                </span>
              </label>
              <input
                className="input mono"
                placeholder="e.g. netsuite"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
              />
              <span className="help">
                Lowercase letters, numbers, and hyphens only.
              </span>
            </div>

            <div className="field" style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 6 }}>
                Description
                <span
                  style={{
                    fontWeight: 400,
                    color: "var(--muted)",
                    marginLeft: 6,
                    fontSize: 12,
                  }}
                >
                  (optional)
                </span>
              </label>
              <textarea
                className="textarea"
                placeholder="Brief description of this division's focus…"
                rows={2}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </div>

            <div className="field" style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 6 }}>
                Division Head
                <span
                  style={{
                    fontWeight: 400,
                    color: "var(--muted)",
                    marginLeft: 6,
                    fontSize: 12,
                  }}
                >
                  (optional)
                </span>
              </label>
              <select
                className="select"
                value={newHeadId}
                onChange={(e) => setNewHeadId(e.target.value)}
              >
                <option value="">— Unassigned —</option>
                {headCandidates.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name ?? u.email?.split("@")[0]} —{" "}
                    {u.role.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
              <span className="help">
                Only users with the DIVISION_HEAD or ADMIN role are shown.
              </span>
            </div>

            {createError && (
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
                {createError}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                className="btn ghost"
                onClick={() => setShowCreate(false)}
                disabled={creating}
              >
                Cancel
              </button>
              <button
                className="btn primary"
                onClick={handleCreate}
                disabled={
                  creating ||
                  newName.trim().length < 2 ||
                  newSlug.trim().length < 2
                }
              >
                {creating ? "Creating…" : "Create Division"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
