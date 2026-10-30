import { StoryboardEditor } from "@/components/storyboard-studio";

export default async function StoryboardProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StoryboardEditor projectId={id} />;
}
