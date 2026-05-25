import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const GET = auth(async function GET(req) {
  const session = req.auth;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url param required" }, { status: 400 });

  // Parse ticket ID from URL (e.g. https://folio3.atlassian.net/browse/QA-1234)
  const match = url.match(/\/browse\/([A-Z]+-\d+)/i);
  const ticketId = match?.[1]?.toUpperCase();
  if (!ticketId) {
    return NextResponse.json(
      { error: "Could not parse Jira ticket ID. Expected format: /browse/PROJECT-123" },
      { status: 400 }
    );
  }

  const baseUrl = process.env.JIRA_BASE_URL;
  const token = process.env.JIRA_API_TOKEN;
  const email = process.env.JIRA_EMAIL;

  if (baseUrl && token && email) {
    try {
      const apiUrl = `${baseUrl}/rest/api/3/issue/${ticketId}?fields=summary,timetracking,assignee,customfield_10020`;
      const resp = await fetch(apiUrl, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`,
          Accept: "application/json",
        },
      });

      if (resp.ok) {
        const data = await resp.json();
        const projectKey = ticketId.split("-")[0];
        const hoursLogged = (data.fields?.timetracking?.timeSpentSeconds ?? 0) / 3600;
        const sprint = data.fields?.customfield_10020?.[0]?.name ?? "";
        const assignee = data.fields?.assignee?.displayName ?? "";

        return NextResponse.json({
          ticketId,
          summary: data.fields?.summary ?? ticketId,
          projectKey,
          hoursLogged: Math.round(hoursLogged * 10) / 10,
          assignee,
          sprint,
        });
      }
    } catch (e) {
      console.error("Jira fetch error:", e);
    }
  }

  // No credentials or fetch failed — return parsed data only
  const projectKey = ticketId.split("-")[0];
  return NextResponse.json({
    ticketId,
    summary: `${ticketId} — ticket details unavailable (add Jira API token to .env)`,
    projectKey,
    hoursLogged: 0,
    assignee: "",
    sprint: "",
  });
});
