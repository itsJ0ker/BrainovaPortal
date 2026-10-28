import { redirect } from "next/navigation";

export default function SignUpPage() {
  // Sign up is disabled across the platform. Institutional access is invite-only.
  redirect("/sign-in");
}
