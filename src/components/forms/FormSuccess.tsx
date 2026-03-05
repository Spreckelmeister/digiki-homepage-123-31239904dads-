import { CheckCircle } from "lucide-react";

interface FormSuccessProps {
  title: string;
  message: string;
}

export default function FormSuccess({ title, message }: FormSuccessProps) {
  return (
    <div className="text-center py-12">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <CheckCircle className="h-8 w-8 text-green-600" aria-hidden="true" />
      </div>
      <h2 className="text-xl font-semibold text-primary mb-2">{title}</h2>
      <p className="text-text-light">{message}</p>
    </div>
  );
}
