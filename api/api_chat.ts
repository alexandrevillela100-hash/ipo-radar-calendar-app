// ============================================================================
//  api/chat.ts — Vercel serverless function for fact-sheet Q&A
//
//  Save as:  calendar-app/api/chat.ts   (note: at REPO ROOT, not src/)
//
//  Vercel auto-detects this as a serverless function and exposes it
//  at https://<your-app>/api/chat. The frontend FactSheetChat
//  component POSTs to this endpoint with the user's question.
//
//  Required environment variable (set in Vercel project settings):
//    ANTHROPIC_API_KEY    Get it from https://console.anthropic.com/settings/keys
//
//  Required dependencies (add to package.json, then `npm install`):
//    @anthropic-ai/sdk
//    @vercel/node          (devDependency, for types only)
// ============================================================================

import type { VercelRequest, VercelResponse } from "@vercel/node";
import Anthropic from "@anthropic-ai/sdk";

// Use the fast/cheap Haiku model — well-suited for chat-style Q&A
// over structured context. Cost: roughly $0.005-0.02 per chat turn.
const MODEL = "claude-haiku-4-5-20251001";

// Token budget — keep responses concise. Claude will stop on its own
// well before this in most cases.
const MAX_TOKENS = 800;

// ─── System prompt ──────────────────────────────────────────────────
// Substitute {COMPANY_NAME} and {FILING_DATA_JSON} at request time.
const SYSTEM_PROMPT_TEMPLATE = `You are IPO Radar AI's analyst assistant. You help investors understand IPOs by answering questions about a specific company that has filed an S-1 registration with the SEC.

CONTEXT:
The user is currently viewing the fact sheet for: {COMPANY_NAME}. Below is the structured data extracted from their S-1 filing. Use it as your primary source of truth.

S-1 STRUCTURED DATA:
{FILING_DATA_JSON}

GROUND RULES:

1. PRIMARY SOURCE — the S-1 filing data above:
   When the user's question can be answered from this data, do so and prefix the answer with "Per the S-1 filing,..." or "According to the filing,..."

2. SECONDARY SOURCE — your general knowledge:
   If the answer requires information not in the S-1, you may use your training-data knowledge — but you MUST flag this clearly. Examples:
     • "This isn't in the S-1; from general market context, ..."
     • "Based on publicly known information about [company/sector], ..."
     • "Per news reports from before my training cutoff: ..."

3. NEVER FABRICATE:
   Don't invent specific numbers, dates, or quotes. If you don't know, say so plainly: "The S-1 doesn't disclose this, and I don't have reliable external information."

4. STYLE:
   Keep responses concise (2-4 sentences typically). Use plain language. Avoid jargon unless explaining it. Lead with the answer; cite the source at the end of each substantive claim.

5. NO INVESTMENT ADVICE:
   You do not recommend buying or selling securities. If asked "should I invest?", redirect to: "I can summarize the disclosed facts, but the decision is yours and depends on your strategy and risk tolerance."

EXAMPLE EXCHANGES:

Q: "What's the offering size?"
A: "Per the S-1 filing, the offering is ~$500M across roughly 25M units priced at $19–$21, implying a ~$10B post-IPO market cap."

Q: "Who are the lead underwriters?"
A: "Per the S-1 filing, lead underwriters are Goldman Sachs, Morgan Stanley, and Citigroup."

Q: "What does Pershing Square do?"
A: "This isn't covered in the S-1 directly, but from general market context: Pershing Square Capital Management is a concentrated activist hedge fund founded by Bill Ackman in 2004. It typically holds 8-12 large-cap North American equity positions and pursues board-level engagement to drive shareholder value."

Q: "Will this IPO go up?"
A: "I can't predict outcomes. The S-1 lays out both the bull case (permanent capital structure, established track record) and the key risks (key-person dependency on Ackman, persistent NAV discount risk). The investment decision depends on your own thesis and risk tolerance."
`;

// ─── Handler ────────────────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  filing: Record<string, unknown>;
  messages: ChatMessage[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS — explicit allow so this works from any deployment of the
  // landing-page or calendar-app domain. Tighten this if you want
  // stricter origin control.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[chat] ANTHROPIC_API_KEY env var is not set");
    return res
      .status(500)
      .json({ error: "Server is missing ANTHROPIC_API_KEY env var" });
  }

  let body: RequestBody;
  try {
    body =
      typeof req.body === "string"
        ? (JSON.parse(req.body) as RequestBody)
        : (req.body as RequestBody);
  } catch (e) {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const { filing, messages } = body;
  if (!filing || !Array.isArray(messages) || messages.length === 0) {
    return res
      .status(400)
      .json({ error: "Body must include `filing` and a non-empty `messages` array" });
  }

  // Limit conversation length to keep token budget under control.
  // Keep only the most recent 12 turns.
  const recentMessages = messages.slice(-12);

  const companyName =
    (filing.companyName as string) || "this company";
  const systemPrompt = SYSTEM_PROMPT_TEMPLATE
    .replace("{COMPANY_NAME}", companyName)
    .replace("{FILING_DATA_JSON}", JSON.stringify(filing, null, 2));

  const anthropic = new Anthropic({ apiKey });

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: recentMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => ("text" in b ? b.text : ""))
      .join("");

    return res.status(200).json({
      reply: text.trim(),
      usage: {
        input_tokens: response.usage?.input_tokens,
        output_tokens: response.usage?.output_tokens,
      },
    });
  } catch (err: any) {
    console.error("[chat] Claude API error:", err);
    return res.status(500).json({
      error: "Chat service error",
      detail: err?.message ?? String(err),
    });
  }
}
