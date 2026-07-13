import "server-only";
import { getResolvedConfig } from "@/services/config";
import type { ServiceResult } from "@/lib/types";

/**
 * OpenAI-compatible adapter for drafting content.
 * Dry-run (no key): returns sensible canned drafts so the UI flow works.
 */
async function complete(
  orgId: string,
  system: string,
  user: string
): Promise<ServiceResult<{ text: string }>> {
  const config = await getResolvedConfig(orgId);

  if (!config.ai.enabled) {
    return {
      ok: true,
      dryRun: true,
      data: { text: "" }, // caller supplies its own fallback
    };
  }

  try {
    const res = await fetch(`${config.ai.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.ai.apiKey}`,
      },
      body: JSON.stringify({
        model: config.ai.model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_tokens: 400,
        temperature: 0.7,
      }),
    });
    if (!res.ok) throw new Error(`AI API error ${res.status}: ${await res.text()}`);
    const json = await res.json();
    const text: string = json.choices?.[0]?.message?.content?.trim() ?? "";
    return { ok: true, data: { text } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "AI request failed" };
  }
}

export const aiService = {
  async draftSocialCaption(
    orgId: string,
    input: { title: string; postType: string; notes?: string }
  ): Promise<ServiceResult<{ text: string }>> {
    const result = await complete(
      orgId,
      "You are a social media copywriter for an Indian real estate brand. Write catchy, concise captions with relevant hashtags. No emojis overload — max 3.",
      `Draft a caption for a ${input.postType.replace(/_/g, " ")} titled "${input.title}".${
        input.notes ? ` Context: ${input.notes}` : ""
      }`
    );
    if (result.dryRun) {
      return {
        ...result,
        data: {
          text: `${input.title} — discover your next home with us. DM to know more! #RealEstate #DreamHome #PropertyGoals`,
        },
      };
    }
    return result;
  },

  async draftPropertyDescription(
    orgId: string,
    input: {
      title: string;
      location: string;
      propertyType: string;
      bedrooms?: number | null;
      sizeSqft?: number | null;
      amenities?: string[];
    }
  ): Promise<ServiceResult<{ text: string }>> {
    const result = await complete(
      orgId,
      "You are a real estate listing writer. Write a compelling 60-90 word property description. Professional tone, no exaggeration.",
      `Property: ${input.title}, ${input.propertyType} in ${input.location}.` +
        (input.bedrooms ? ` ${input.bedrooms} bedrooms.` : "") +
        (input.sizeSqft ? ` ${input.sizeSqft} sq ft.` : "") +
        (input.amenities?.length ? ` Amenities: ${input.amenities.join(", ")}.` : "")
    );
    if (result.dryRun) {
      return {
        ...result,
        data: {
          text: `${input.title} is a well-appointed ${input.propertyType} in ${input.location}${
            input.bedrooms ? ` offering ${input.bedrooms} spacious bedrooms` : ""
          }. Enjoy excellent connectivity, modern amenities and a vibrant neighbourhood — an ideal choice for families and investors alike. Schedule a site visit today.`,
        },
      };
    }
    return result;
  },

  async draftFollowupMessage(
    orgId: string,
    input: { leadName: string; context: string }
  ): Promise<ServiceResult<{ text: string }>> {
    const result = await complete(
      orgId,
      "You draft short, warm WhatsApp follow-up messages for a real estate agent. Max 2 sentences.",
      `Lead: ${input.leadName}. Context: ${input.context}`
    );
    if (result.dryRun) {
      return {
        ...result,
        data: {
          text: `Hi ${input.leadName}, hope you're doing well! Just wanted to check in on your property search — happy to line up a few great options whenever you're ready.`,
        },
      };
    }
    return result;
  },
};
