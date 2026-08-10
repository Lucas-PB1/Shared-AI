import fs from "node:fs";
import { spawnSync } from "node:child_process";

export type LlmProvider = "cursor" | "openai" | "anthropic" | string;

type ChatCompletionsResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

type AnthropicResponse = {
  content?: Array<{ type: string; text?: string }>;
};

export function resolveProvider(): LlmProvider {
  if (process.env.REVIEW_LLM_PROVIDER) {
    return process.env.REVIEW_LLM_PROVIDER.toLowerCase();
  }
  if (process.env.CURSOR_API_KEY) return "cursor";
  return "openai";
}

function resolveAgentBin(): string {
  const candidates = [
    process.env.CURSOR_AGENT_BIN,
    `${process.env.HOME}/.cursor/bin/agent`,
    `${process.env.HOME}/.local/bin/agent`,
  ].filter(Boolean) as string[];
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  return "agent";
}

export async function callOpenAI(
  system: string,
  user: string,
): Promise<string> {
  const apiKey = process.env.REVIEW_LLM_API_KEY;
  const model = process.env.REVIEW_LLM_MODEL || "gpt-4o-mini";
  const baseUrl = (
    process.env.REVIEW_LLM_BASE_URL || "https://api.openai.com/v1"
  ).replace(/\/$/, "");

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API ${res.status}: ${err.slice(0, 500)}`);
  }

  const data = (await res.json()) as ChatCompletionsResponse;
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

export async function callAnthropic(
  system: string,
  user: string,
): Promise<string> {
  const apiKey = process.env.REVIEW_LLM_API_KEY;
  const model = process.env.REVIEW_LLM_MODEL || "claude-sonnet-4-20250514";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey ?? "",
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: user }],
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${err.slice(0, 500)}`);
  }

  const data = (await res.json()) as AnthropicResponse;
  const block = data.content?.find((b) => b.type === "text");
  return block?.text?.trim() ?? "";
}

export async function callCursor(
  system: string,
  user: string,
): Promise<string> {
  const apiKey = process.env.CURSOR_API_KEY || process.env.REVIEW_LLM_API_KEY;
  if (!apiKey) {
    throw new Error("CURSOR_API_KEY não definido");
  }

  const prompt = `${system}\n\n---\n\n${user}`;
  const agent = resolveAgentBin();
  const args = ["-p", "--force", prompt];
  if (process.env.REVIEW_LLM_MODEL) {
    args.push("--model", process.env.REVIEW_LLM_MODEL);
  }

  const result = spawnSync(agent, args, {
    encoding: "utf8",
    env: { ...process.env, CURSOR_API_KEY: apiKey },
    maxBuffer: 15 * 1024 * 1024,
    timeout: 600_000,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }
  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || "agent failed").trim();
    throw new Error(`Cursor agent exit ${result.status}: ${err.slice(0, 800)}`);
  }

  return result.stdout.trim();
}

export async function callLLM(system: string, user: string): Promise<string> {
  const provider = resolveProvider();
  if (provider === "cursor") return callCursor(system, user);
  if (provider === "anthropic") return callAnthropic(system, user);
  return callOpenAI(system, user);
}
