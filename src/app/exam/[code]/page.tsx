import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ExamSharePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  redirect(`/portal?code=${encodeURIComponent(code)}`);
}
