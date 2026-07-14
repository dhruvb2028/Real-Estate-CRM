"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, requireProfile } from "@/lib/supabase/server";
import { aiService } from "@/services/aiService";
import { socialPostService } from "@/services/socialPostService";
import { notificationService } from "@/services/notificationService";
import { socialPostFormSchema } from "@/lib/validations";
import type { ActionState, SocialPost, SocialPostStatus } from "@/lib/types";

export async function createSocialPost(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const profile = await requireProfile();
  const parsed = socialPostFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;

  const supabase = await createClient();
  const mediaUrls = formData.getAll("mediaUrls[]").map(String).filter(Boolean);

  const { data: post, error } = await supabase
    .from("social_posts")
    .insert({
      organization_id: profile.organization_id,
      title: d.title,
      post_type: d.postType,
      caption: d.caption || null,
      media_urls: mediaUrls,
      status: d.status,
      scheduled_at: d.scheduledAt ? new Date(d.scheduledAt).toISOString() : null,
      assigned_to: d.assignedTo || null,
      notes: d.notes || null,
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error || !post) return { ok: false, error: error?.message ?? "Failed to create post" };

  if (d.assignedTo && d.assignedTo !== profile.id) {
    await notificationService.notify({
      orgId: profile.organization_id!,
      userId: d.assignedTo,
      type: "social_post_due",
      title: "Social post assigned",
      body: d.title,
      link: "/social",
    });
  }

  revalidatePath("/social");
  redirect("/social");
}

export async function updateSocialPostStatus(
  postId: string,
  status: SocialPostStatus
): Promise<ActionState> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const updates: Record<string, unknown> = { status };
  if (status === "published") updates.published_at = new Date().toISOString();

  const { data: post, error } = await supabase
    .from("social_posts")
    .update(updates)
    .eq("id", postId)
    .select("*")
    .single();
  if (error) return { ok: false, error: error.message };

  // Scheduled/published posts can be handed off to Zapier/Buffer etc.
  let handoff = "";
  if (status === "scheduled" || status === "published") {
    const result = await socialPostService.pushToWebhook(
      profile.organization_id!,
      post as SocialPost
    );
    handoff = result.dryRun ? " (webhook simulated)" : result.ok ? " (sent to webhook)" : "";
  }

  revalidatePath("/social");
  return { ok: true, message: `Post ${status}${handoff}` };
}

export async function deleteSocialPost(postId: string): Promise<ActionState> {
  await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("social_posts").delete().eq("id", postId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/social");
  return { ok: true, message: "Post deleted" };
}

/** AI caption helper — dry-run returns a sensible canned caption. */
export async function generateCaption(
  title: string,
  postType: string,
  notes?: string
): Promise<ActionState & { caption?: string }> {
  const profile = await requireProfile();
  if (!title.trim()) return { ok: false, error: "Give the post a title first" };

  const result = await aiService.draftSocialCaption(profile.organization_id!, {
    title,
    postType,
    notes,
  });
  if (!result.ok) return { ok: false, error: result.error };
  return {
    ok: true,
    caption: result.data?.text,
    message: result.dryRun ? "Draft caption (AI dry-run — add an API key for real drafts)" : "Caption drafted",
  };
}
