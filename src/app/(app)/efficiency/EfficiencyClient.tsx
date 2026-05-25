"use client";

interface TypeRow {
  type: string;
  label: string;
  efficiency: number;
  avgWithout: number;
  avgWith: number;
  totalSaved: number;
  count: number;
}

interface ProjectRow {
  name: string;
  efficiency: number;
  totalSaved: number;
  count: number;
  avgWithout: number;
  avgWith: number;
}

interface ToolRow {
  tool: string;
  efficiency: number;
  count: number;
  totalWithout: number;
  totalWith: number;
}

interface MonthRow {
  label: string;
  efficiency: number;
  count: number;
  saved: number;
}

interface Props {
  overallEfficiency: number;
  avgMultiplier: number;
  totalWithout: number;
  totalWith: number;
  totalSaved: number;
  totalClaims: number;
  byType: TypeRow[];
  byProject: ProjectRow[];
  byTool: ToolRow[];
  monthlyTrend: MonthRow[];
}

function efficiencyColor(pct: number) {
  if (pct >= 60) return "var(--green)";
  if (pct >= 35) return "var(--amber)";
  return "var(--red)";
}

function EffBar({ pct }: { pct: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
      <div style={{
        flex: 1, height: 8, background: "var(--border)", borderRadius: 99, overflow: "hidden",
      }}>
        <div style={{
          height: "100%", width: `${Math.min(pct, 100)}%`,
          background: efficiencyColor(pct), borderRadius: 99,
          transition: "width 0.4s ease",
        }} />
      </div>
      <span style={{
        fontSize: 13, fontWeight: 700, color: efficiencyColor(pct),
        minWidth: 44, textAlign: "right", fontFamily: "var(--mono)",
      }}>
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

export function EfficiencyClient({
  overallEfficiency,
  avgMultiplier,
  totalWithout,
  totalWith,
  totalSaved,
  totalClaims,
  byType,
  byProject,
  byTool,
  monthlyTrend,
}: Props) {
  // FTE days (8h/day, 5d/week = 40h/week)
  const fteDays = Math.round((totalSaved / 8) * 10) / 10;
  const dollarValue = Math.round(totalSaved * 45);
  const maxMonthEfficiency = Math.max(...monthlyTrend.map((m) => m.efficiency), 1);

  return (
    <div className="page wide">
      {/* ── Page header ── */}
      <div className="page-head">
        <div>
          <h1>Productivity Efficiency</h1>
          <p className="sub">
            How much faster your team delivers with AI — based on {totalClaims} verified, approved claims.
          </p>
        </div>
        <div className="head-actions">
          <button
            className="btn ghost"
            onClick={() => window.print()}
          >
            🖨 Print / Export
          </button>
        </div>
      </div>

      {/* ── Hero banner ── */}
      <div style={{
        background: "linear-gradient(135deg, #C0392B 0%, #96281b 100%)",
        borderRadius: 14,
        padding: "32px 40px",
        color: "#fff",
        marginBottom: 28,
        display: "flex",
        alignItems: "center",
        gap: 48,
        flexWrap: "wrap",
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.8, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Overall Productivity Gain
          </div>
          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1, fontFamily: "var(--mono)" }}>
            {overallEfficiency.toFixed(0)}%
          </div>
          <div style={{ fontSize: 15, opacity: 0.85, marginTop: 8 }}>
            faster delivery with AI tools
          </div>
        </div>

        <div style={{ width: 1, height: 80, background: "rgba(255,255,255,0.2)", flexShrink: 0 }} />

        <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 36, fontWeight: 700, fontFamily: "var(--mono)", lineHeight: 1 }}>
              {avgMultiplier.toFixed(1)}×
            </div>
            <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>average speed multiplier</div>
          </div>
          <div>
            <div style={{ fontSize: 36, fontWeight: 700, fontFamily: "var(--mono)", lineHeight: 1 }}>
              {totalSaved.toFixed(0)}h
            </div>
            <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>total hours reclaimed</div>
          </div>
          <div>
            <div style={{ fontSize: 36, fontWeight: 700, fontFamily: "var(--mono)", lineHeight: 1 }}>
              {fteDays}d
            </div>
            <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>FTE days freed</div>
          </div>
          <div>
            <div style={{ fontSize: 36, fontWeight: 700, fontFamily: "var(--mono)", lineHeight: 1 }}>
              ${dollarValue.toLocaleString()}
            </div>
            <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>estimated cost saved</div>
          </div>
        </div>
      </div>

      {/* ── Insight callout ── */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderLeft: "4px solid var(--red)",
        borderRadius: 8,
        padding: "14px 20px",
        marginBottom: 28,
        fontSize: 14,
        color: "var(--ink-2)",
        lineHeight: 1.6,
      }}>
        <strong style={{ color: "var(--ink)" }}>Presales insight: </strong>
        If a task would traditionally take <strong>{totalWithout.toFixed(0)} hours</strong>, your team
        now delivers the same output in <strong>{totalWith.toFixed(0)} hours</strong> using AI tools —
        a <strong>{overallEfficiency.toFixed(0)}% reduction</strong> in effort.
        That means you can bid <strong>{overallEfficiency.toFixed(0)}% lower on effort estimates</strong> while
        maintaining the same quality, giving prospects a more competitive price and you a higher win rate.
      </div>

      {/* ── Two-column grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>

        {/* By claim type */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">Efficiency by Claim Type</div>
          </div>
          <div style={{ padding: "8px 0" }}>
            {byType.map((row) => (
              <div key={row.type} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 20px", borderBottom: "1px solid var(--border)",
              }}>
                <div style={{ minWidth: 140 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{row.label}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                    {row.count} claim{row.count !== 1 ? "s" : ""} · avg {row.avgWithout.toFixed(0)}h → {row.avgWith.toFixed(0)}h
                  </div>
                </div>
                <EffBar pct={row.efficiency} />
              </div>
            ))}
          </div>
        </div>

        {/* By AI tool */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">Efficiency by AI Tool</div>
          </div>
          {byTool.length === 0 ? (
            <div className="empty-state" style={{ padding: 24 }}>
              <p>No tool data yet.</p>
            </div>
          ) : (
            <div style={{ padding: "8px 0" }}>
              {byTool.map((row) => (
                <div key={row.tool} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 20px", borderBottom: "1px solid var(--border)",
                }}>
                  <div style={{ minWidth: 140 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", textTransform: "capitalize" }}>
                      {row.tool}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                      used in {row.count} claim{row.count !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <EffBar pct={row.efficiency} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── By project ── */}
      {byProject.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-head">
            <div className="card-title">Efficiency by Project</div>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Project</th>
                <th>Avg Hours: Before AI</th>
                <th>Avg Hours: With AI</th>
                <th>Claims</th>
                <th>Hours Reclaimed</th>
                <th style={{ width: 200 }}>Efficiency</th>
              </tr>
            </thead>
            <tbody>
              {byProject.map((row, i) => (
                <tr key={row.name}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: "var(--muted)",
                        minWidth: 20, fontFamily: "var(--mono)",
                      }}>
                        #{i + 1}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{row.name}</span>
                    </div>
                  </td>
                  <td className="mono">{row.avgWithout.toFixed(1)}h</td>
                  <td className="mono" style={{ color: "var(--green)", fontWeight: 600 }}>
                    {row.avgWith.toFixed(1)}h
                  </td>
                  <td className="mono">{row.count}</td>
                  <td className="mono" style={{ color: "var(--green)", fontWeight: 600 }}>
                    {row.totalSaved.toFixed(1)}h
                  </td>
                  <td>
                    <EffBar pct={row.efficiency} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Monthly trend ── */}
      <div className="card">
        <div className="card-head">
          <div className="card-title">Monthly Efficiency Trend</div>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>Last 6 months</span>
        </div>
        <div style={{ padding: "20px 24px" }}>
          {/* Bar chart */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 120, marginBottom: 8 }}>
            {monthlyTrend.map((m) => {
              const barHeight = maxMonthEfficiency > 0
                ? Math.max((m.efficiency / maxMonthEfficiency) * 100, m.count > 0 ? 4 : 0)
                : 0;
              return (
                <div key={m.label} style={{
                  flex: 1, display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end",
                }}>
                  {m.count > 0 && (
                    <div style={{ fontSize: 10, fontWeight: 700, color: efficiencyColor(m.efficiency), fontFamily: "var(--mono)" }}>
                      {m.efficiency.toFixed(0)}%
                    </div>
                  )}
                  <div
                    title={m.count > 0 ? `${m.efficiency.toFixed(1)}% · ${m.count} claims · ${m.saved}h saved` : "No claims"}
                    style={{
                      width: "100%",
                      height: `${barHeight}%`,
                      background: m.count > 0 ? efficiencyColor(m.efficiency) : "var(--border)",
                      borderRadius: "4px 4px 0 0",
                      minHeight: m.count > 0 ? 4 : 2,
                      opacity: m.count > 0 ? 1 : 0.4,
                      transition: "height 0.3s ease",
                    }}
                  />
                </div>
              );
            })}
          </div>
          {/* Month labels */}
          <div style={{ display: "flex", gap: 12 }}>
            {monthlyTrend.map((m) => (
              <div key={m.label} style={{
                flex: 1, textAlign: "center", fontSize: 11,
                color: "var(--muted)", fontWeight: 500,
              }}>
                {m.label}
                {m.count > 0 && (
                  <div style={{ fontSize: 10, marginTop: 2 }}>{m.saved}h saved</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Raw comparison table ── */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-head">
          <div className="card-title">Summary: Before vs. After AI</div>
        </div>
        <div style={{ padding: "16px 24px" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th />
                <th>Without AI</th>
                <th>With AI</th>
                <th>Difference</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Total Hours</strong></td>
                <td className="mono">{totalWithout.toFixed(1)}h</td>
                <td className="mono" style={{ color: "var(--green)", fontWeight: 600 }}>{totalWith.toFixed(1)}h</td>
                <td className="mono" style={{ color: "var(--green)", fontWeight: 700 }}>
                  −{(totalWithout - totalWith).toFixed(1)}h
                </td>
              </tr>
              <tr>
                <td><strong>Average Per Task</strong></td>
                <td className="mono">{(totalWithout / totalClaims).toFixed(1)}h</td>
                <td className="mono" style={{ color: "var(--green)", fontWeight: 600 }}>
                  {(totalWith / totalClaims).toFixed(1)}h
                </td>
                <td className="mono" style={{ color: "var(--green)", fontWeight: 700 }}>
                  −{((totalWithout - totalWith) / totalClaims).toFixed(1)}h per task
                </td>
              </tr>
              <tr>
                <td><strong>Speed Multiplier</strong></td>
                <td className="mono">1.0×</td>
                <td className="mono" style={{ color: "var(--green)", fontWeight: 600 }}>{avgMultiplier.toFixed(1)}×</td>
                <td className="mono" style={{ color: "var(--green)", fontWeight: 700 }}>
                  {avgMultiplier.toFixed(1)}× faster on average
                </td>
              </tr>
              <tr>
                <td><strong>FTE Days Freed</strong></td>
                <td className="mono">—</td>
                <td className="mono" style={{ color: "var(--green)", fontWeight: 600 }}>{fteDays}d</td>
                <td className="mono" style={{ color: "var(--green)", fontWeight: 700 }}>
                  ≈ {(fteDays / 20).toFixed(1)} person-months
                </td>
              </tr>
              <tr>
                <td><strong>Estimated Cost Saved</strong></td>
                <td className="mono">—</td>
                <td className="mono" style={{ color: "var(--green)", fontWeight: 600 }}>${dollarValue.toLocaleString()}</td>
                <td className="mono" style={{ color: "var(--green)", fontWeight: 700 }}>
                  at $45/hr blended rate
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
