import { redirect } from "next/navigation";

export default function AdminYearsRedirect() {
  redirect("/admin/albums");
}
