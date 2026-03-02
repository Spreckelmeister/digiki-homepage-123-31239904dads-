import {
  GraduationCap,
  Laptop,
  Languages,
  Users,
  Network,
  Server,
} from "lucide-react";

const iconMap = {
  GraduationCap,
  Laptop,
  Languages,
  Users,
  Network,
  Server,
} as const;

interface FeatureCardProps {
  title: string;
  description: string;
  icon: keyof typeof iconMap;
}

export default function FeatureCard({ title, description, icon }: FeatureCardProps) {
  const IconComponent = iconMap[icon];

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-border">
      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
        <IconComponent className="w-6 h-6 text-primary" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-light leading-relaxed">{description}</p>
    </div>
  );
}
