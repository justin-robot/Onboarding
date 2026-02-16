import { redirect } from "next/navigation";

// Redirect authenticated users to workspaces page
export default function App() {
  redirect("/workspaces");
}
