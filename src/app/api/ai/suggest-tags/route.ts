import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { getSessionFromCookie } from "@/lib/session";

const TagSuggestionSchema = z.object({
  suggestedTags: z
    .array(z.string().describe("Concise lowercase alphanumeric tag without #"))
    .min(1)
    .max(8),
});

export async function POST(req: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { text, title, existingTags = [] } = await req.json();

    if (!text && !title) {
      return NextResponse.json(
        { error: "Text or title is required" },
        { status: 400 },
      );
    }

    const contentSample = `${title ? `Title: ${title}\n` : ""}${text ? text.slice(0, 4000) : ""}`;
    let tags: string[] = [];

    try {
      if (
        !process.env.OPENAI_API_KEY ||
        process.env.OPENAI_API_KEY.includes("your-openai-api-key")
      ) {
        throw new Error("No valid OpenAI API key");
      }

      const { object } = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: TagSuggestionSchema,
        prompt: `You are an expert document categorization and metadata tagging assistant.
Analyze the following document and generate 3 to 6 concise, relevant, lower-case categorization tags (e.g. 'dev', 'architecture', 'database', 'design', 'finance', 'meeting').
Do not include '#' symbols.

Existing Tags to Avoid Duplicating: ${JSON.stringify(existingTags)}

Content:
"${contentSample}"`,
      });

      tags = object.suggestedTags;
    } catch {
      // Heuristic extraction fallback
      const cleanContent = contentSample.toLowerCase();
      const candidates = [
        "architecture",
        "backend",
        "frontend",
        "database",
        "security",
        "devops",
        "design",
        "api",
        "testing",
        "planning",
        "ai",
        "performance",
        "product",
      ];
      tags = candidates
        .filter((c) => cleanContent.includes(c) && !existingTags.includes(c))
        .slice(0, 4);
      if (tags.length === 0) {
        tags = ["note", "draft", "work"];
      }
    }

    const normalized = tags
      .map((t) =>
        t
          .toLowerCase()
          .replace(/[^a-z0-9-_]/g, "")
          .trim(),
      )
      .filter((t) => t.length > 1 && !existingTags.includes(t));

    return NextResponse.json({
      success: true,
      tags: normalized,
    });
  } catch (error) {
    console.error("[API /api/ai/suggest-tags Error]:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
