const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.title = "AImpact — AI Productivity Intelligence";
pres.author = "M1 Group";

const RED = "C0392B";
const WHITE = "FFFFFF";
const DARK = "1A1A2E";
const MUTED = "6B7280";
const LIGHT_BG = "F8F9FA";
const BLUE = "2563EB";
const BLUE_SOFT = "DBEAFE";
const AMBER = "D97706";
const AMBER_SOFT = "FEF3C7";
const GREEN = "16A34A";
const GREEN_SOFT = "DCFCE7";

function addHeader(slide, title) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.85,
    fill: { color: RED }, line: { color: RED },
  });
  slide.addText(title, {
    x: 0.4, y: 0, w: 9.2, h: 0.85,
    fontSize: 22, fontFace: "Calibri", bold: true,
    color: WHITE, valign: "middle", margin: 0,
  });
}

// ─── SLIDE 1 — Title ─────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: WHITE };

  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 3.2,
    fill: { color: RED }, line: { color: RED },
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 0.55, w: 0.7, h: 0.7,
    fill: { color: "A93226" }, line: { color: "A93226" },
  });
  s.addText("⚡", {
    x: 0.5, y: 0.55, w: 0.7, h: 0.7,
    fontSize: 22, align: "center", valign: "middle", margin: 0,
  });
  s.addText("AImpact", {
    x: 1.35, y: 0.42, w: 8, h: 1.1,
    fontSize: 54, fontFace: "Calibri", bold: true,
    color: WHITE, valign: "middle", margin: 0,
  });
  s.addText("AI Productivity Intelligence Platform", {
    x: 1.35, y: 1.55, w: 8, h: 0.6,
    fontSize: 20, fontFace: "Calibri",
    color: "F1C0BB", valign: "middle", margin: 0,
  });
  s.addShape(pres.shapes.LINE, {
    x: 0.5, y: 2.42, w: 9, h: 0,
    line: { color: "A93226", width: 1 },
  });
  s.addText("M1 Group  |  May 2026", {
    x: 1.35, y: 2.55, w: 8, h: 0.5,
    fontSize: 14, fontFace: "Calibri",
    color: "F9D5D2", valign: "middle", margin: 0,
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 3.2, w: 10, h: 2.425,
    fill: { color: LIGHT_BG }, line: { color: LIGHT_BG },
  });
  s.addText("Track. Verify. Prove ROI.", {
    x: 0.5, y: 3.5, w: 9, h: 0.8,
    fontSize: 28, fontFace: "Calibri", bold: true,
    color: DARK, align: "center", valign: "middle", margin: 0,
  });
  const pillars = ["📊  Track AI time savings", "✅  Verify with 3-layer approval", "💰  Report business value to leadership"];
  pillars.forEach((p, i) => {
    s.addText(p, {
      x: 0.5 + i * 3.1, y: 4.5, w: 2.9, h: 0.6,
      fontSize: 12, fontFace: "Calibri", color: MUTED,
      align: "center", valign: "middle", margin: 0,
    });
  });
}

// ─── SLIDE 2 — The Business Problem ──────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  addHeader(s, "The Business Problem");

  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 1.05, w: 9, h: 1.05,
    fill: { color: "FDF4F2" }, line: { color: "E8B4AE", width: 1 },
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 1.05, w: 0.12, h: 1.05,
    fill: { color: RED }, line: { color: RED },
  });
  s.addText('"We\'re investing in AI tools — but how do we know it\'s working?"', {
    x: 0.75, y: 1.05, w: 8.6, h: 1.05,
    fontSize: 17, fontFace: "Calibri", italic: true, bold: true,
    color: DARK, valign: "middle", margin: 8,
  });

  const problems = [
    { icon: "👁", title: "No Visibility", body: "No way to see how much time AI is actually saving across teams and projects" },
    { icon: "📉", title: "No ROI Proof", body: "Leadership cannot quantify the return on AI tool investment with verified data" },
    { icon: "❓", title: "No Accountability", body: "Unknown which projects and teams are actively adopting AI vs ignoring it" },
  ];
  problems.forEach((p, i) => {
    const x = 0.5 + i * 3.08;
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 2.3, w: 2.9, h: 2.5,
      fill: { color: LIGHT_BG }, line: { color: "E5E7EB", width: 1 },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 2.3, w: 2.9, h: 0.08,
      fill: { color: RED }, line: { color: RED },
    });
    s.addText(p.icon, { x, y: 2.45, w: 2.9, h: 0.6, fontSize: 26, align: "center", valign: "middle", margin: 0 });
    s.addText(p.title, {
      x, y: 3.1, w: 2.9, h: 0.45,
      fontSize: 14, fontFace: "Calibri", bold: true,
      color: DARK, align: "center", valign: "middle", margin: 0,
    });
    s.addText(p.body, {
      x: x + 0.15, y: 3.6, w: 2.6, h: 1.1,
      fontSize: 11, fontFace: "Calibri", color: MUTED,
      align: "center", valign: "top", margin: 0,
    });
  });

  s.addText("Without measurement, AI investment is a leap of faith.", {
    x: 0.5, y: 5.0, w: 9, h: 0.4,
    fontSize: 11, fontFace: "Calibri", italic: true,
    color: MUTED, align: "center", valign: "middle", margin: 0,
  });
}

// ─── SLIDE 3 — What AImpact Does ─────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  addHeader(s, "What AImpact Does");

  s.addText("3-Layer Verified Productivity Tracking", {
    x: 0.5, y: 0.95, w: 9, h: 0.5,
    fontSize: 16, fontFace: "Calibri", bold: true,
    color: DARK, align: "center", valign: "middle", margin: 0,
  });

  [3.42, 6.52].forEach(ax => {
    s.addText("→", {
      x: ax - 0.05, y: 2.3, w: 0.4, h: 0.4,
      fontSize: 18, color: MUTED, align: "center", valign: "middle", margin: 0,
    });
  });

  const layers = [
    { icon: "📋", label: "LAYER 1", title: "Submit", color: BLUE, soft: BLUE_SOFT,
      body: "Team members submit AI productivity claims with hours saved, tools used, and Jira ticket linked" },
    { icon: "👥", label: "LAYER 2", title: "Corroborate", color: AMBER, soft: AMBER_SOFT,
      body: "A peer witness confirms the AI usage on that ticket — eliminating self-reported guesswork" },
    { icon: "✅", label: "LAYER 3", title: "Approve", color: GREEN, soft: GREEN_SOFT,
      body: "QA Lead or Project Manager reviews, validates, and approves — creating an auditable record" },
  ];

  layers.forEach((l, i) => {
    const x = 0.4 + i * 3.12;
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.6, w: 2.9, h: 3.5,
      fill: { color: l.soft }, line: { color: l.color, width: 1.5 },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.6, w: 2.9, h: 0.1,
      fill: { color: l.color }, line: { color: l.color },
    });
    s.addText(l.label, {
      x: x + 0.15, y: 1.72, w: 1.2, h: 0.3,
      fontSize: 8, fontFace: "Calibri", bold: true,
      color: l.color, valign: "middle", margin: 0,
    });
    s.addText(l.icon, { x, y: 2.05, w: 2.9, h: 0.65, fontSize: 30, align: "center", valign: "middle", margin: 0 });
    s.addText(l.title, {
      x, y: 2.75, w: 2.9, h: 0.5,
      fontSize: 18, fontFace: "Calibri", bold: true,
      color: l.color, align: "center", valign: "middle", margin: 0,
    });
    s.addText(l.body, {
      x: x + 0.15, y: 3.3, w: 2.6, h: 1.65,
      fontSize: 11, fontFace: "Calibri", color: DARK,
      align: "center", valign: "top", margin: 0,
    });
  });

  s.addText("Every claim is verified — not self-reported guesswork.", {
    x: 0.5, y: 5.2, w: 9, h: 0.35,
    fontSize: 12, fontFace: "Calibri", bold: true,
    color: RED, align: "center", valign: "middle", margin: 0,
  });
}

// ─── SLIDE 4 — Business Value ─────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  addHeader(s, "Business Value — The Numbers");

  const tiles = [
    { icon: "⏱", title: "Hours Saved", body: "Tracked per claim, per project, and per team member", color: BLUE, soft: BLUE_SOFT },
    { icon: "💰", title: "Dollar Value", body: "$45/hr industry estimate gives direct cost saving visibility to leadership", color: GREEN, soft: GREEN_SOFT },
    { icon: "👤", title: "FTE Days Freed", body: "Capacity reclaimed — translate hours into headcount equivalent freed up", color: "7C3AED", soft: "EDE9FE" },
    { icon: "📈", title: "Adoption Rate", body: "See which projects lead AI adoption and which need a push from management", color: AMBER, soft: AMBER_SOFT },
  ];

  tiles.forEach((t, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.4 + col * 4.65;
    const y = 1.0 + row * 2.15;

    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 4.45, h: 2.0,
      fill: { color: t.soft }, line: { color: t.color, width: 1.5 },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 0.1, h: 2.0,
      fill: { color: t.color }, line: { color: t.color },
    });
    s.addText(t.icon, { x: x + 0.15, y: y + 0.2, w: 0.7, h: 0.7, fontSize: 26, align: "center", valign: "middle", margin: 0 });
    s.addText(t.title, {
      x: x + 0.9, y: y + 0.18, w: 3.3, h: 0.5,
      fontSize: 15, fontFace: "Calibri", bold: true,
      color: t.color, valign: "middle", margin: 0,
    });
    s.addText(t.body, {
      x: x + 0.9, y: y + 0.72, w: 3.35, h: 1.1,
      fontSize: 11, fontFace: "Calibri", color: DARK,
      valign: "top", margin: 0,
    });
  });

  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.4, y: 5.05, w: 9.2, h: 0.45,
    fill: { color: "FDF4F2" }, line: { color: "E8B4AE", width: 1 },
  });
  s.addText("Project Managers get their own adoption dashboard — see which teams are driving results.", {
    x: 0.55, y: 5.05, w: 9.0, h: 0.45,
    fontSize: 11, fontFace: "Calibri", italic: true,
    color: RED, align: "center", valign: "middle", margin: 0,
  });
}

// ─── SLIDE 5 — Roadmap ───────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  addHeader(s, "Roadmap & Next Steps");

  // LEFT — Live Today
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.4, y: 1.0, w: 4.35, h: 4.1,
    fill: { color: "F0FDF4" }, line: { color: GREEN, width: 1.5 },
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.4, y: 1.0, w: 4.35, h: 0.52,
    fill: { color: GREEN }, line: { color: GREEN },
  });
  s.addText("✅  Live Today", {
    x: 0.55, y: 1.0, w: 4.0, h: 0.52,
    fontSize: 14, fontFace: "Calibri", bold: true,
    color: WHITE, valign: "middle", margin: 0,
  });

  const liveItems = [
    "AI claim submission with Jira integration",
    "3-layer verification (submit → corroborate → approve)",
    "Project-level PM adoption dashboard",
    "Trust tiers & team leaderboard",
    "Executive reports dashboard",
  ];
  s.addText(liveItems.map((t, i) => ({
    text: t,
    options: { bullet: { code: "25CF", color: GREEN }, color: DARK, breakLine: i < liveItems.length - 1 },
  })), {
    x: 0.6, y: 1.6, w: 3.95, h: 3.35,
    fontSize: 11.5, fontFace: "Calibri", valign: "top", margin: 0,
  });

  // RIGHT — Coming Next
  s.addShape(pres.shapes.RECTANGLE, {
    x: 5.25, y: 1.0, w: 4.35, h: 4.1,
    fill: { color: "EFF6FF" }, line: { color: BLUE, width: 1.5 },
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 5.25, y: 1.0, w: 4.35, h: 0.52,
    fill: { color: BLUE }, line: { color: BLUE },
  });
  s.addText("🚀  Coming Next", {
    x: 5.4, y: 1.0, w: 4.0, h: 0.52,
    fontSize: 14, fontFace: "Calibri", bold: true,
    color: WHITE, valign: "middle", margin: 0,
  });

  const nextItems = [
    "Peer corroboration confirmation flow — notify witness & confirm via UI",
    "Division-level structure (NetSuite, Dynamics, App Dev, Ecommerce, ML/AI)",
    "Division Head oversight & approval routing",
    "Date-range filters on all reports",
    "PDF & CSV export for board reporting",
  ];
  s.addText(nextItems.map((t, i) => ({
    text: t,
    options: { bullet: { code: "25CF", color: BLUE }, color: DARK, breakLine: i < nextItems.length - 1 },
  })), {
    x: 5.45, y: 1.6, w: 3.95, h: 3.35,
    fontSize: 11.5, fontFace: "Calibri", valign: "top", margin: 0,
  });

  // Bottom closing line
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.4, y: 5.28, w: 9.2, h: 0.48,
    fill: { color: RED }, line: { color: RED },
  });
  s.addText("AImpact turns AI investment into a measurable, provable business advantage.", {
    x: 0.5, y: 5.28, w: 9.1, h: 0.48,
    fontSize: 12, fontFace: "Calibri", bold: true,
    color: WHITE, align: "center", valign: "middle", margin: 0,
  });
}

// ─── Write file ───────────────────────────────────────────────────────────────
pres.writeFile({ fileName: "C:\\Users\\uhussain\\Desktop\\AIUsage\\aimpact\\AImpact-Stakeholder-Demo-v2.pptx" })
  .then(() => console.log("✅ Saved: AImpact-Stakeholder-Demo-v2.pptx"))
  .catch(err => { console.error("❌ Error:", err); process.exit(1); });
