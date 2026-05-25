"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./submit.module.css";

interface Peer {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  tier: string;
  approvalCount: number;
}

interface Project {
  id: string;
  name: string;
  jiraProjectKey: string | null;
  pm: { name: string | null };
}

interface JiraTicket {
  ticketId: string;
  summary: string;
  projectKey: string;
  hoursLogged: number;
  assignee: string;
  sprint: string;
}

const TOOLS = [
  { id: "claude", label: "Claude Code", cls: "claude" },
  { id: "play", label: "Playwright MCP", cls: "play" },
  { id: "netsuite", label: "NetSuite MCP", cls: "netsuite" },
  { id: "design", label: "Design AI", cls: "design" },
  { id: "custom", label: "Other AI", cls: "custom" },
];

const CLAIM_TYPES = [
  { value: "TEST_AUTOMATION", label: "Test Automation" },
  { value: "BUG_DETECTION", label: "Bug Detection" },
  { value: "REGRESSION", label: "Regression Testing" },
  { value: "CI_CD", label: "CI/CD Pipeline" },
  { value: "CODE_REVIEW", label: "Code Review" },
  { value: "OTHER", label: "Other" },
];

function getInitials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function getAvatarClass(email?: string | null) {
  if (!email) return "";
  const n = email.charCodeAt(0) % 9;
  return n > 0 ? `a-${n + 1}` : "";
}

export function SubmitClaimClient({
  userId,
  peers,
  projects,
  settings = {},
}: {
  userId: string;
  peers: Peer[];
  projects: Project[];
  settings?: Record<string, string>;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Derived settings flags
  const requireCorroborator = settings.require_corroborator !== "false";
  const requireJiraTicket = settings.require_jira_ticket === "true";
  const requireProject = settings.require_project === "true";

  // Step 1
  const [jiraUrl, setJiraUrl] = useState("");
  const [jiraTicket, setJiraTicket] = useState<JiraTicket | null>(null);
  const [jiraLoading, setJiraLoading] = useState(false);
  const [jiraError, setJiraError] = useState("");
  const [projectId, setProjectId] = useState("");

  // Step 2
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [claimType, setClaimType] = useState("TEST_AUTOMATION");
  const [estimatedWithout, setEstimatedWithout] = useState("");
  const [estimatedWith, setEstimatedWith] = useState("");
  const [description, setDescription] = useState("");

  // Step 3
  const [corroboratorId, setCorroboratorId] = useState("");
  const [peerSearch, setPeerSearch] = useState("");

  const hoursSaved = Math.max(0, Number(estimatedWithout) - Number(estimatedWith));
  const dollarValue = (hoursSaved * 45).toFixed(0);

  const filteredPeers = peers.filter((p) =>
    peerSearch === "" ||
    (p.name ?? "").toLowerCase().includes(peerSearch.toLowerCase()) ||
    (p.email ?? "").toLowerCase().includes(peerSearch.toLowerCase())
  );

  async function handleJiraFetch() {
    if (!jiraUrl.trim()) return;
    setJiraLoading(true);
    setJiraError("");
    try {
      const res = await fetch(`/api/jira?url=${encodeURIComponent(jiraUrl)}`);
      if (!res.ok) {
        const d = await res.json();
        setJiraError(d.error ?? "Could not fetch ticket.");
      } else {
        const data = await res.json();
        setJiraTicket(data);
        // Auto-select project if jiraProjectKey matches a known project
        if (data.projectKey) {
          const match = projects.find((p) => p.jiraProjectKey === data.projectKey);
          if (match) setProjectId(match.id);
        }
      }
    } catch {
      setJiraError("Network error. Please try again.");
    } finally {
      setJiraLoading(false);
    }
  }

  function toggleTool(id: string) {
    setSelectedTools((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  // Validate step 1 for required fields
  function canProceedFromStep1(): boolean {
    if (requireJiraTicket && !jiraUrl.trim()) return false;
    if (requireProject && !projectId) return false;
    return true;
  }

  // When corroborator is not required, submitting from step 2 goes straight through
  function handleProceedFromStep2() {
    if (requireCorroborator) {
      setStep(3);
    } else {
      handleSubmit();
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jiraTicketUrl: jiraUrl,
          jiraTicketId: jiraTicket?.ticketId ?? jiraUrl,
          jiraProjectKey: jiraTicket?.projectKey,
          jiraSummary: jiraTicket?.summary,
          jiraHoursLogged: jiraTicket?.hoursLogged ?? 0,
          jiraAssignee: jiraTicket?.assignee,
          jiraSprint: jiraTicket?.sprint,
          estimatedWithout: Number(estimatedWithout),
          estimatedWith: Number(estimatedWith),
          hoursSaved,
          toolsUsed: selectedTools,
          claimType,
          description,
          corroboratorId: corroboratorId || undefined,
          projectId: projectId || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to submit claim.");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedCorroborator = peers.find((p) => p.id === corroboratorId);

  return (
    <div className="page" style={{ maxWidth: 1080 }}>
      <div className="page-head">
        <div>
          <div className="crumbs">
            <a href="/dashboard">Dashboard</a>
            <span className="sep">›</span>
            <span>Submit Claim</span>
          </div>
          <h1>Submit AI Productivity Claim</h1>
          <p className="sub">
            {requireCorroborator
              ? "3-step process: Jira link → impact details → corroborator"
              : "2-step process: Jira link → impact details"}
          </p>
        </div>
      </div>

      {/* ── Stepper ── */}
      <div className={styles.stepper}>
        {[
          { n: 1, label: "Jira Ticket", sub: "Link & auto-fetch" },
          { n: 2, label: "Impact Details", sub: "Tools & hours" },
          ...(requireCorroborator ? [{ n: 3, label: "Corroboration", sub: "Peer & routing" }] : []),
        ].map(({ n, label, sub }) => (
          <div
            key={n}
            className={`${styles.step} ${step === n ? styles.active : step > n ? styles.done : styles.upcoming}`}
            onClick={() => { if (n < step) setStep(n); }}
          >
            <div className={styles.stepNum}>
              {step > n ? "✓" : n}
            </div>
            <div>
              <div className={styles.stepLbl}>{sub}</div>
              <div className={styles.stepName}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.layout}>
        <div className={styles.main}>
          {/* ── Step 1 ── */}
          {step === 1 && (
            <div className="card">
              <div className="card-head">
                <div className="card-title">
                  Jira Ticket
                  <span className="count">Step 1</span>
                </div>
                {!requireJiraTicket && (
                  <span className="chip neutral" style={{ fontSize: 11 }}>
                    <span className="bullet" />Optional
                  </span>
                )}
              </div>
              <div style={{ padding: 22 }}>
                <div className="field" style={{ marginBottom: 16 }}>
                  <label>
                    Jira Ticket URL
                    {requireJiraTicket ? (
                      <span style={{ color: "var(--rose)", marginLeft: 4 }}>*</span>
                    ) : (
                      <span style={{ fontWeight: 400, color: "var(--muted)", marginLeft: 6 }}>(optional)</span>
                    )}
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
                    <div className="input-wrap">
                      <input
                        className="input mono"
                        placeholder="https://folio3.atlassian.net/browse/QA-1234"
                        value={jiraUrl}
                        onChange={(e) => { setJiraUrl(e.target.value); setJiraTicket(null); setJiraError(""); }}
                        onKeyDown={(e) => e.key === "Enter" && handleJiraFetch()}
                      />
                    </div>
                    <button
                      className="btn primary"
                      onClick={handleJiraFetch}
                      disabled={jiraLoading || !jiraUrl.trim()}
                    >
                      {jiraLoading ? "Fetching…" : "Fetch Ticket"}
                    </button>
                  </div>
                  {jiraError && (
                    <p style={{ color: "var(--rose)", fontSize: 12, marginTop: 4 }}>{jiraError}</p>
                  )}
                  {requireJiraTicket && !jiraUrl.trim() && (
                    <p style={{ color: "var(--rose)", fontSize: 12, marginTop: 4 }}>
                      A Jira ticket URL is required to submit a claim.
                    </p>
                  )}
                  <p className="help">
                    {requireJiraTicket
                      ? "A Jira ticket URL is required for all claims. Paste the URL and click Fetch Ticket."
                      : "Linking a Jira ticket improves your claim’s credibility and approval rate. You can skip this if no ticket exists for this task."}
                  </p>
                </div>

                {jiraTicket && (
                  <div className={styles.jiraCard}>
                    <div className={styles.jiraCardHead}>
                      <span className="ticket">{jiraTicket.ticketId}</span>
                      <span className="chip approved">
                        <span className="bullet" />Jira Matched
                      </span>
                      <button
                        className="btn sm ghost"
                        style={{ marginLeft: "auto" }}
                        onClick={() => { setJiraTicket(null); setJiraUrl(""); }}
                      >
                        ✕ Clear
                      </button>
                    </div>
                    <p style={{ fontWeight: 600, fontSize: 14, margin: "10px 0 12px" }}>
                      {jiraTicket.summary}
                    </p>
                    <div className={styles.jiraMeta}>
                      <div><span className={styles.jiraMetaLabel}>Project</span>{jiraTicket.projectKey}</div>
                      <div><span className={styles.jiraMetaLabel}>Sprint</span>{jiraTicket.sprint || "—"}</div>
                      <div><span className={styles.jiraMetaLabel}>Hours Logged</span><b style={{ color: "var(--ink)", fontFamily: "var(--mono)" }}>{jiraTicket.hoursLogged}h</b></div>
                      <div><span className={styles.jiraMetaLabel}>Assignee</span>{jiraTicket.assignee || "—"}</div>
                    </div>
                  </div>
                )}

                {!jiraTicket && (
                  <div style={{
                    background: "var(--surface)", border: "1px dashed var(--border)",
                    borderRadius: 8, padding: "24px 20px", textAlign: "center", color: "var(--muted)",
                  }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>🔗</div>
                    <p style={{ fontSize: 13 }}>Paste a Jira URL above and click <b>Fetch Ticket</b> to auto-fill details.</p>
                    <p style={{ fontSize: 12, marginTop: 6, color: "var(--muted-2)" }}>
                      Claims with a linked Jira ticket get a higher approval confidence score.
                    </p>
                  </div>
                )}

                {/* Project picker */}
                <div className="field" style={{ marginTop: 20 }}>
                  <label>
                    Project
                    {requireProject ? (
                      <span style={{ color: "var(--rose)", marginLeft: 4 }}>*</span>
                    ) : (
                      <span style={{ fontWeight: 400, color: "var(--muted)", marginLeft: 6 }}>(optional)</span>
                    )}
                  </label>
                  {projects.length === 0 ? (
                    <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
                      No projects set up yet. Ask your Project Manager or Admin to create one.
                    </p>
                  ) : (
                    <select
                      className="select"
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                    >
                      <option value="">{requireProject ? "— Select a project —" : "— No project / unassigned —"}</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}{p.jiraProjectKey ? ` (${p.jiraProjectKey})` : ""}{p.pm.name ? ` · PM: ${p.pm.name.split(" ")[0]}` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                  {projectId && jiraTicket && (() => {
                    const proj = projects.find((p) => p.id === projectId);
                    const autoMatched = proj?.jiraProjectKey === jiraTicket.projectKey;
                    return autoMatched ? (
                      <p style={{ fontSize: 12, color: "var(--green)", marginTop: 6 }}>
                        ✓ Auto-matched from Jira key <b>{jiraTicket.projectKey}</b>
                      </p>
                    ) : null;
                  })()}
                  <span className="help">
                    Links this claim to a project for PM adoption tracking.
                  </span>
                </div>

                <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  {!requireJiraTicket && (
                    <button
                      className="btn ghost"
                      onClick={() => setStep(2)}
                      style={{ color: "var(--muted)" }}
                    >
                      Skip Jira →
                    </button>
                  )}
                  {requireJiraTicket && <span />}
                  <button
                    className="btn primary"
                    onClick={() => setStep(2)}
                    disabled={!canProceedFromStep1()}
                  >
                    {jiraTicket ? "Next: Impact Details →" : requireJiraTicket ? "Fetch ticket to continue" : "Continue without Jira →"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2 ── */}
          {step === 2 && (
            <div className="card">
              <div className="card-head">
                <div className="card-title">
                  Impact Details
                  <span className="count">Step 2</span>
                </div>
              </div>
              <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Tool picker */}
                <div className="field">
                  <label>AI Tools Used</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {TOOLS.map((t) => (
                      <button
                        key={t.id}
                        className={styles.toolToggle}
                        style={selectedTools.includes(t.id) ? {
                          background: "var(--red-soft)", borderColor: "var(--red)", color: "var(--red-700)"
                        } : {}}
                        onClick={() => toggleTool(t.id)}
                        type="button"
                      >
                        <span className={`sw ${t.cls}`} />
                        {t.label}
                        {selectedTools.includes(t.id) && " ✓"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Claim type */}
                <div className="field">
                  <label>Claim Type</label>
                  <select
                    className="select"
                    value={claimType}
                    onChange={(e) => setClaimType(e.target.value)}
                  >
                    {CLAIM_TYPES.map((ct) => (
                      <option key={ct.value} value={ct.value}>{ct.label}</option>
                    ))}
                  </select>
                </div>

                {/* Hours grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                  <div className="field">
                    <label>Hours Without AI</label>
                    <input
                      className="input mono"
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="e.g. 8"
                      value={estimatedWithout}
                      onChange={(e) => setEstimatedWithout(e.target.value)}
                    />
                    <span className="help">How long without AI?</span>
                  </div>
                  <div className="field">
                    <label>Hours With AI</label>
                    <input
                      className="input mono"
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="e.g. 2"
                      value={estimatedWith}
                      onChange={(e) => setEstimatedWith(e.target.value)}
                    />
                    <span className="help">Actual time spent</span>
                  </div>
                  <div className="field">
                    <label>Hours Saved</label>
                    <div
                      className="input mono"
                      style={{
                        background: "var(--green-soft)", border: "1px solid var(--green)",
                        color: "var(--green)", fontWeight: 700, display: "flex", alignItems: "center"
                      }}
                    >
                      {hoursSaved > 0 ? `+${hoursSaved.toFixed(1)}h` : "—"}
                    </div>
                    <span className="help">Auto-calculated</span>
                  </div>
                </div>

                {/* Description */}
                <div className="field">
                  <label>Description</label>
                  <textarea
                    className="textarea"
                    placeholder="Describe what you achieved with AI assistance and how it saved time…"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{ minHeight: 100 }}
                  />
                  <span className="help">
                    Be specific: what was automated, what bugs were caught, what was reviewed?
                    ({description.length}/500 chars)
                  </span>
                </div>

                {!requireCorroborator && error && (
                  <div style={{ color: "var(--rose)", fontSize: 13, padding: "10px 14px", background: "var(--rose-soft)", borderRadius: 6 }}>
                    {error}
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
                  <button className="btn ghost" onClick={() => setStep(1)}>← Back</button>
                  <button
                    className="btn primary"
                    onClick={handleProceedFromStep2}
                    disabled={
                      selectedTools.length === 0 ||
                      !estimatedWithout ||
                      !estimatedWith ||
                      !description.trim() ||
                      submitting
                    }
                  >
                    {requireCorroborator
                      ? "Next: Corroboration →"
                      : submitting
                      ? "Submitting…"
                      : "Submit Claim →"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3 ── */}
          {requireCorroborator && step === 3 && (
            <div className="card">
              <div className="card-head">
                <div className="card-title">
                  Corroboration & Routing
                  <span className="count">Step 3</span>
                </div>
              </div>
              <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 20 }}>
                <div className="field">
                  <label>Select Corroborator (Peer Witness)</label>
                  <input
                    className="input"
                    placeholder="Search team members…"
                    value={peerSearch}
                    onChange={(e) => setPeerSearch(e.target.value)}
                  />
                  <span className="help">
                    Choose a colleague who can confirm your AI usage on this ticket.
                    They must not be your direct manager.
                  </span>
                </div>

                <div className={styles.peerList}>
                  {filteredPeers.slice(0, 8).map((p) => (
                    <div
                      key={p.id}
                      className={`${styles.peerRow} ${corroboratorId === p.id ? styles.peerSelected : ""}`}
                      onClick={() => setCorroboratorId(p.id)}
                    >
                      <div className={`avatar sm ${getAvatarClass(p.email)}`}>
                        {getInitials(p.name)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{p.name ?? p.email}</div>
                        <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                          {p.role.replace(/_/g, " ")}
                        </div>
                      </div>
                      <span className="chip neutral" style={{ fontSize: 10 }}>
                        <span className="bullet" />
                        {p.tier}
                      </span>
                      {corroboratorId === p.id && (
                        <span style={{ color: "var(--green)", fontWeight: 700 }}>✓</span>
                      )}
                    </div>
                  ))}
                  {filteredPeers.length === 0 && (
                    <p style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: 16 }}>
                      No team members found.
                    </p>
                  )}
                </div>

                {/* Routing preview */}
                <div className={styles.routingCard}>
                  <div className={styles.routingTitle}>📬 Approval Routing</div>
                  <div className={styles.routingSteps}>
                    <div className={styles.routingStep}>
                      <span className={styles.routingDot} style={{ background: "var(--blue)" }} />
                      <div>
                        <b>Layer 1 — Auto-validation</b>
                        <p>Jira hours & assignee checked automatically</p>
                      </div>
                    </div>
                    <div className={styles.routingStep}>
                      <span className={styles.routingDot} style={{ background: "var(--amber)" }} />
                      <div>
                        <b>Layer 2 — Peer corroboration</b>
                        <p>{selectedCorroborator ? `${selectedCorroborator.name ?? selectedCorroborator.email} will confirm your claim` : "Select a corroborator above"}</p>
                      </div>
                    </div>
                    <div className={styles.routingStep}>
                      <span className={styles.routingDot} style={{ background: "var(--green)" }} />
                      <div>
                        <b>Layer 3 — Lead approval</b>
                        <p>{claimType === "CI_CD" ? "Dev Lead" : claimType === "TEST_AUTOMATION" || claimType === "REGRESSION" ? "QA Lead" : "Project Manager"} will review & approve</p>
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <div style={{ color: "var(--rose)", fontSize: 13, padding: "10px 14px", background: "var(--rose-soft)", borderRadius: 6 }}>
                    {error}
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
                  <button className="btn ghost" onClick={() => setStep(2)}>← Back</button>
                  <button
                    className="btn primary lg"
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? "Submitting…" : "Submit Claim →"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Live impact sidebar ── */}
        <div className={styles.impactSidebar}>
          <div className={styles.impactCard}>
            <div className={styles.impactTitle}>Live Impact Preview</div>

            <div className={styles.impactRow}>
              <span className={styles.impactLabel}>Hours Saved</span>
              <span className={styles.impactVal} style={{ color: hoursSaved > 0 ? "var(--green)" : "var(--muted-2)" }}>
                {hoursSaved > 0 ? `+${hoursSaved.toFixed(1)}h` : "—"}
              </span>
            </div>
            <div className={styles.impactRow}>
              <span className={styles.impactLabel}>$ Value</span>
              <span className={styles.impactVal} style={{ color: hoursSaved > 0 ? "var(--green)" : "var(--muted-2)" }}>
                {hoursSaved > 0 ? `$${dollarValue}` : "—"}
              </span>
            </div>
            <div className={styles.impactRow}>
              <span className={styles.impactLabel}>Tools</span>
              <span className={styles.impactVal}>
                {selectedTools.length > 0 ? selectedTools.length : "—"}
              </span>
            </div>
            <div className={styles.impactRow}>
              <span className={styles.impactLabel}>Claim Type</span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
                {CLAIM_TYPES.find((c) => c.value === claimType)?.label ?? "—"}
              </span>
            </div>
            <div className={styles.impactRow}>
              <span className={styles.impactLabel}>Jira Match</span>
              <span className={`chip ${jiraTicket ? "approved" : jiraUrl ? "pending" : "neutral"}`} style={{ fontSize: 11 }}>
                <span className="bullet" />
                {jiraTicket ? "Verified" : jiraUrl ? "Pending fetch" : "No Jira"}
              </span>
            </div>
            <div className={styles.impactRow}>
              <span className={styles.impactLabel}>Project</span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
                {projectId ? (projects.find((p) => p.id === projectId)?.name ?? "—") : "Unassigned"}
              </span>
            </div>

            <div className={styles.impactDivider} />

            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
              Claims with a Jira link get higher approval confidence. Without Jira, peer corroboration carries more weight.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
