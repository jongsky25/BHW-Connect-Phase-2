import { redirect } from "next/navigation";

export default function AdminKbIndexPage() {
  redirect("/admin/kb/entries");
}
