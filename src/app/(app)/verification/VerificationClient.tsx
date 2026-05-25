"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./verification.module.css";

interface ClaimUser {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  tier?: string;
  approvalCount?: number;
}

interface Claim {
  id: string;
  jiraTicketId: string;
  jiraTicketUrl: string;
  jiraSummary: string | null;
  jiraHoursLogged: number;
  estimatedWithout: number;
  estimatedWith: number;
  hoursSaved: number;
  toolsUsed: string;
  claimType: string;
  description: string;
  status: string;
  jiraMatchPct: number;
  corroboratorNote: string | null;
  submitter: ClaimUser;
  corroborator: ClaimUser | null;
  createdAt: Date | string;
  project: { name: string } | null;
}

function getInitials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function getAvatarClass(email?: string | null) {
  if (!email) return "";
  const n = email.charCodeAt(0) % 9;
  return n > 0 ? `a-${n + 1}` : "";
}

export function VerificationClient({ claims, approverId }: { claims: Claim[]; approverId: string }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>(claims[0]?.id ?? "");
  const [reduceHours, setReduceHours] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(false);

  const selected = claims.find((c) => c.id === selectedId);
  const corroborated = claims.filter((c) => c.status === "CORROBORATED");
  const pending = claims.filter((c) => c.status === "PENDING");

  async function handleAction(action: "approve" | "reduce" | "reject") {
    if (!selected) return;
    setLoading(true);
    try {
      await fetch(`/api/claims/${selected.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          approvedHours: action === "reduce" ? Number(reduceHours) : undefined,
          rejectReason: action === "reject" ? rejectReason : undefined,
        }),
      });
      router.refresh();
      setSelectedId(claims.find((c) => c.id !== selected.id)?.id ?? "");
    } finally {
      setLoading(false);
    }
  }

  const tools = (() => {
    try { return selected ? JSON.parse(selected.toolsUsed) as string[] : []; }
    catch { return []; }
  })();

  const toolLabel = (t: string) => t === "claude" ? "Claude Code" : t === "play" ? "Playwright MCP" : t === "netsuite" ? "NetSuite MCP" : t;

  return (
    <div className="page wide">
      <div className="page-head">
        <div>
          <h1>Verification Queue</h1>
          <p className="sub">
            <b>{corroborated.length}</b> ready · <b>{pending.length}</b> awaiting corroboration
          </p>
        </div>
      </div>

      {claims.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ padding: 64 }}>
            <div style={{ fontSize: 40 }}>✅</div>
            <h3 style={{ marginTop: 12 }}>Queue is clear!</h3>
            <p>No claims pending review right now.</p>
          </div>
        </div>
      ) : (
        <div className={styles.layout}>
          {/* ── Left: claim list ── */}
          <div className={styles.queueList}>
            {corroborated.length > 0 && (
              <div className={styles.queueGroup}>
                <div className={styles.queueGroupLabel}>
                  ✅ Corroborated — Ready to Approve ({corroborated.length})
                </div>
                {corroborated.map((c) => (
                  <QueueRow key={c.id} claim={c} selected={selectedId === c.id} onClick={() => setSelectedId(c.id)} />
                ))}
              </div>
            )}
            {pending.length > 0 && (
              <div className={styles.queueGroup}>
                <div className={styles.queueGroupLabel}>
                  ⏳ Awaiting Corroboration ({pending.length})
                </div>
                {pending.map((c) => (
                  <QueueRow key={c.id} claim={c} selected={selectedId === c.id} onClick={() => setSelectedId(c.id)} />
                ))}
              </div>
            )}
          </div>

          {/* ── Right: detail panel ── */}
          {selected && (
            <div className={styles.detail}>
              {/* Header */}
              <div className={styles.detailHead}>
                <div>
                  <a href={selected.jiraTicketUrl} target="_blank" rel="noopener noreferrer" className="ticket">
                    {selected.jiraTicketId}
                  </a>
                  <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 8, marginBottom: 4 }}>
                    {selected.jiraSummary ?? selected.jiraTicketId}
                  </h2>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {selected.project && (
                      <span style={{
                        fontSize: 12, fontWeight: 600, color: "var(--blue)",
                        background: "var(--blue-soft)", borderRadius: 4,
                        padding: "2px 8px",
                      }}>
                        📁 {selected.project.name}
                      </span>
                    )}
                    <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 4 }}>
                      🕐 {new Date(selected.createdAt).toLocaleString("en-GB", {
                        day: "2-digit", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                    <span className={`chip ${selected.status === "CORROBORATED" ? "corroborated" : "pending"}`}>
                      <span className="bullet" />
                      {selected.status === "CORROBORATED" ? "Corroborated" : "Pending"}
                    </span>
                    {selected.jiraMatchPct > 0 && (
                      <span className={`chip ${selected.jiraMatchPct >= 80 ? "approved" : "pending"}`} style={{ fontSize: 11 }}>
                        Jira {selected.jiraMatchPct}% match
                      </span>
                    )}
                    {tools.map((t) => (
                      <span key={t} className="tool-chip">
                        <span className={`sw ${t}`} />{toolLabel(t)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submitter */}
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Submitted by</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                  <div className={`avatar md ${getAvatarClass(selected.submitter.email)}`}>
                    {getInitials(selected.submitter.name)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{selected.submitter.name}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>
                      {selected.submitter.role.replace(/_/g, " ")} · {selected.submitter.tier} tier · {selected.submitter.approvalCount} past approvals
                    </div>
                  </div>
                </div>
              </div>

              {/* Hours comparison */}
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Hours Analysis</div>
                <div className={styles.hoursGrid}>
                  <div className={styles.hoursBox}>
                    <div className={styles.hoursLabel}>Without AI</div>
                    <div className={styles.hoursVal}>{selected.estimatedWithout}h</div>
                  </div>
                  <div className={styles.hoursBox}>
                    <div className={styles.hoursLabel}>With AI</div>
                    <div className={styles.hoursVal}>{selected.estimatedWith}h</div>
                  </div>
                  <div className={styles.hoursBox} style={{ background: "var(--green-soft)", border: "1px solid var(--green)" }}>
                    <div className={styles.hoursLabel} style={{ color: "#166534" }}>Saved</div>
                    <div className={styles.hoursVal} style={{ color: "var(--green)" }}>+{selected.hoursSaved}h</div>
                  </div>
                  {selected.jiraHoursLogged > 0 && (
                    <div className={styles.hoursBox}>
                      <div className={styles.hoursLabel}>Jira Logged</div>
                      <div className={styles.hoursVal}>{selected.jiraHoursLogged}h</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Corroborator */}
              {selected.corroborator && (
                <div className={styles.section}>
                  <div className={styles.sectionTitle}>Corroborator</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                    <div className={`avatar sm ${getAvatarClass(selected.corroborator.email)}`}>
                      {getInitials(selected.corroborator.name)}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{selected.corroborator.name}</span>
                    {selected.corroboratorNote && (
                      <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 4 }}>
                        &ldquo;{selected.corroboratorNote}&rdquo;
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Description</div>
                <p style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 8, lineHeight: 1.6 }}>
                  {selected.description}
                </p>
              </div>

              {/* Actions */}
              <div className={styles.actions}>
                <div className={styles.actionsRow}>
                  <button
                    className="btn success"
                    onClick={() => handleAction("approve")}
                    disabled={loading}
                    title="Approve (A)"
                  >
                    ✓ Approve {selected.hoursSaved}h
                  </button>

                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      className="input mono"
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="Hours…"
                      value={reduceHours}
                      onChange={(e) => setReduceHours(e.target.value)}
                      style={{ width: 90, padding: "8px 10px" }}
                    />
                    <button
                      className="btn warning"
                      onClick={() => handleAction("reduce")}
                      disabled={loading || !reduceHours}
                      title="Reduce (R)"
                    >
                      ↓ Reduce
                    </button>
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      className="input"
                      placeholder="Reason…"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      style={{ width: 130, padding: "8px 10px" }}
                    />
                    <button
                      className="btn danger"
                      onClick={() => handleAction("reject")}
                      disabled={loading}
                      title="Reject (X)"
                    >
                      ✕ Reject
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 8 }}>
                  Keyboard: <kbd style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "1px 5px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 3 }}>A</kbd> approve &nbsp;
                  <kbd style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "1px 5px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 3 }}>R</kbd> reduce &nbsp;
                  <kbd style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "1px 5px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 3 }}>X</kbd> reject
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function QueueRow({ claim, selected, onClick }: { claim: Claim; selected: boolean; onClick: () => void }) {
  const tools = (() => {
    try { return JSON.parse(claim.toolsUsed) as string[]; }
    catch { return [] as string[]; }
  })();

  return (
    <div
      className={`${styles.queueRow} ${selected ? styles.queueRowSelected : ""}`}
      onClick={onClick}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <span className="ticket">{claim.jiraTicketId}</span>
          {claim.project && (
            <span style={{
              fontSize: 11, fontWeight: 500, color: "var(--blue)",
              background: "var(--blue-soft)", borderRadius: 4,
              padding: "1px 6px", marginLeft: 8,
            }}>
              {claim.project.name}
            </span>
          )}
          <span style={{ fontSize: 12.5, color: "var(--muted)", marginLeft: 8 }}>
            {claim.submitter.name ?? claim.submitter.email?.split("@")[0]}
          </span>
          <span style={{ fontSize: 11, color: "var(--muted-2)", marginLeft: "auto", whiteSpace: "nowrap" }}>
            {new Date(claim.createdAt).toLocaleString("en-GB", {
              day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
            })}
          </span>
        </div>
        <span style={{
          fontFamily: "var(--mono)", fontSize: 12, fontWeight: 700,
          color: claim.hoursSaved > 8 ? "var(--amber)" : "var(--green)"
        }}>
          +{claim.hoursSaved}h
        </span>
      </div>
      {claim.jiraSummary && (
        <p style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {claim.jiraSummary}
        </p>
      )}
      <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
        {tools.map((t) => (
          <span key={t} className="tool-chip" style={{ fontSize: 11 }}>
            <span className={`sw ${t}`} />
            {t === "claude" ? "Claude" : t === "play" ? "Playwright" : t === "netsuite" ? "NetSuite" : t}
          </span>
        ))}
        <span className={`chip ${claim.status === "CORROBORATED" ? "corroborated" : "pending"}`} style={{ fontSize: 10.5 }}>
          <span className="bullet" />
          {claim.status === "CORROBORATED" ? "Corroborated" : "Pending"}
        </span>
      </div>
    </div>
  );
}
