interface SchoolInfoFieldsProps {
  values: {
    school_name: string;
    school_address: string;
    principal_name: string;
    contact_person: string;
    phone: string;
    email: string;
    teacher_count: string;
    student_count: string;
  };
  onChange: (field: string, value: string) => void;
  inputClass: string;
}

export default function SchoolInfoFields({
  values,
  onChange,
  inputClass,
}: SchoolInfoFieldsProps) {
  return (
    <fieldset>
      <legend className="text-lg font-semibold text-primary mb-4">
        1. Angaben zur Schule
      </legend>
      <div className="space-y-4">
        <div>
          <label
            htmlFor="school_name"
            className="block text-sm font-medium text-text mb-1.5"
          >
            Name der Schule *
          </label>
          <input
            id="school_name"
            type="text"
            required
            value={values.school_name}
            onChange={(e) => onChange("school_name", e.target.value)}
            className={inputClass}
            placeholder="z.B. Grundschule Eversburg"
          />
        </div>
        <div>
          <label
            htmlFor="school_address"
            className="block text-sm font-medium text-text mb-1.5"
          >
            Adresse *
          </label>
          <input
            id="school_address"
            type="text"
            required
            value={values.school_address}
            onChange={(e) => onChange("school_address", e.target.value)}
            className={inputClass}
            placeholder="Straße, PLZ Ort"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="principal_name"
              className="block text-sm font-medium text-text mb-1.5"
            >
              Schulleitung *
            </label>
            <input
              id="principal_name"
              type="text"
              required
              value={values.principal_name}
              onChange={(e) => onChange("principal_name", e.target.value)}
              className={inputClass}
              placeholder="Vor- und Nachname"
            />
          </div>
          <div>
            <label
              htmlFor="contact_person"
              className="block text-sm font-medium text-text mb-1.5"
            >
              Ansprechperson (Name, Funktion) *
            </label>
            <input
              id="contact_person"
              type="text"
              required
              value={values.contact_person}
              onChange={(e) => onChange("contact_person", e.target.value)}
              className={inputClass}
              placeholder="Name, Funktion"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-text mb-1.5"
            >
              Telefon *
            </label>
            <input
              id="phone"
              type="tel"
              required
              value={values.phone}
              onChange={(e) => onChange("phone", e.target.value)}
              className={inputClass}
              placeholder="0541 / ..."
            />
          </div>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-text mb-1.5"
            >
              E-Mail *
            </label>
            <input
              id="email"
              type="email"
              required
              value={values.email}
              onChange={(e) => onChange("email", e.target.value)}
              className={inputClass}
              placeholder="schule@example.de"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="teacher_count"
              className="block text-sm font-medium text-text mb-1.5"
            >
              Anzahl Lehrkräfte
            </label>
            <input
              id="teacher_count"
              type="number"
              min="0"
              value={values.teacher_count}
              onChange={(e) => onChange("teacher_count", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="student_count"
              className="block text-sm font-medium text-text mb-1.5"
            >
              Anzahl Schüler/innen
            </label>
            <input
              id="student_count"
              type="number"
              min="0"
              value={values.student_count}
              onChange={(e) => onChange("student_count", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>
    </fieldset>
  );
}
