import { redirect } from "next/navigation";

// Accounts werden ausschließlich über die Bestandsaufnahme angelegt.
export default function RegisterPage() {
  redirect("/bestandsaufnahme");
}
