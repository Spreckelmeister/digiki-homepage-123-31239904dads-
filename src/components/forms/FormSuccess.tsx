import Link from "next/link";
import { CheckCircle } from "lucide-react";

interface FormSuccessProps {
  title: string;
  message: string;
  /** Optional: E-Mail-Adresse, die zur Statusverfolgung verwendet wurde */
  submittedEmail?: string;
}

export default function FormSuccess({ title, message, submittedEmail }: FormSuccessProps) {
  return (
    <div className="text-center py-12">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <CheckCircle className="h-8 w-8 text-green-600" aria-hidden="true" />
      </div>
      <h2 className="text-xl font-semibold text-primary mb-2">{title}</h2>
      <p className="text-text-light">{message}</p>

      {submittedEmail && (
        <div className="mt-6 mx-auto max-w-md rounded-xl bg-primary/5 border border-primary/20 px-6 py-4 text-sm text-text-light">
          <p className="mb-1">
            <strong className="text-text">Status verfolgen:</strong> Sie können
            den Bearbeitungsstatus jederzeit in der{" "}
            <Link
              href="/best-practice/datenbank"
              className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
            >
              Best-Practice-Datenbank
            </Link>{" "}
            unter dem Abschnitt <em>„Meine Einreichungen"</em> mit Ihrer
            E-Mail-Adresse{" "}
            <strong className="text-text">{submittedEmail}</strong> abrufen.
          </p>
        </div>
      )}
    </div>
  );
}
