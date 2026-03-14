import { redirect } from "next/navigation";
// The admin panel is a unified SPA at /admin — the users section is navigated to via state.
// Redirect here so the URL works as an entry point.
export default function AdminUsersRedirect() { redirect("/admin"); }
