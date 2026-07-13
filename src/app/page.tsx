import { redirect } from "next/navigation";

// Middleware sends authenticated users to /dashboard before this renders.
export default function RootPage() {
  redirect("/login");
}
