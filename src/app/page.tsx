import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const user = await getCurrentUser();

  if (user && user.userId) {
    if (user.role === "super_admin") {
      redirect("/super-admin");
    } else if (user.schoolSlug) {
      redirect(`/school/${user.schoolSlug}`);
    } else {
      redirect("/super-admin");
    }
  }

  redirect("/sign-in");
}
