import type { Metadata } from "next";
import Link from "next/link";
import { Megaphone, Plus } from "lucide-react";
import { getSocialPosts } from "@/server/queries/social";
import { PageHeader } from "@/components/layout/page-header";
import { PostCard } from "@/components/social/post-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SocialPost, SocialPostStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Social Media" };
export const dynamic = "force-dynamic";

function List({ posts }: { posts: SocialPost[] }) {
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed border-border py-14 text-center">
        <Megaphone className="mb-3 size-9 text-muted-foreground/50" aria-hidden />
        <p className="text-sm text-muted-foreground">Nothing here yet.</p>
      </div>
    );
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {posts.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
    </div>
  );
}

export default async function SocialPage() {
  const posts = await getSocialPosts();
  const by = (s: SocialPostStatus) => posts.filter((p) => p.status === s);
  const scheduled = by("scheduled");

  return (
    <>
      <PageHeader
        title="Social Media"
        description="Plan, draft and schedule content"
        action={
          <Button render={<Link href="/social/new" />} className="h-11 md:h-10">
            <Plus className="size-4" aria-hidden /> New post
          </Button>
        }
      />

      <Tabs defaultValue="calendar">
        <TabsList className="mb-3 w-full justify-start overflow-x-auto">
          <TabsTrigger value="calendar">
            Calendar{scheduled.length ? ` (${scheduled.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="idea">Ideas ({by("idea").length})</TabsTrigger>
          <TabsTrigger value="draft">Drafts ({by("draft").length})</TabsTrigger>
          <TabsTrigger value="published">Published</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <List posts={scheduled} />
        </TabsContent>
        <TabsContent value="idea">
          <List posts={by("idea")} />
        </TabsContent>
        <TabsContent value="draft">
          <List posts={by("draft")} />
        </TabsContent>
        <TabsContent value="published">
          <List posts={by("published")} />
        </TabsContent>
      </Tabs>
    </>
  );
}
