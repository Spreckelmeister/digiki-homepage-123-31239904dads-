interface RatingScaleProps {
  label: string;
  options: string[];
  value: number;
  onChange: (value: number) => void;
}

export default function RatingScale({
  label,
  options,
  value,
  onChange,
}: RatingScaleProps) {
  return (
    <div>
      <p className="text-sm font-medium text-text mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onChange(index + 1)}
            className={`inline-flex px-3 py-1.5 rounded-full text-sm transition-colors ${
              value === index + 1
                ? "bg-primary text-white"
                : "bg-bg text-text-light border border-border hover:border-primary"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
