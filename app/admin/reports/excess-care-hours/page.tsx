import { redirect } from "next/navigation";

export default function ReportsExcessCareHoursRedirect() {
  redirect("/admin/care/excess-hours");
}
