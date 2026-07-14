import type { Metadata } from "next";
import { getSocialTeam } from "@/server/queries/social";
import { PageHeader } from "@/components/layout/page-header";
import { PostForm } from "@/components/social/post-form";

export const metadata: Metadata = { title: "New social post" };

export default async function NewSocialPostPage() {
  const team = await getSocialTeam();
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="New post" description="Draft content for your social channels" />
      <PostForm team={team} />
    </div>
  );
}
