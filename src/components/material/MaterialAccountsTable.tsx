export interface MaterialAccount {
  id: string;
  school: string;
  full_name: string;
  email: string;
  confirmed: boolean;
  created_at: string;
}

/**
 * Admin › Schulungsmaterial: Schulkonten ohne Bestandsaufnahme.
 * Als „intern" markierte Konten (Tabelle internal_accounts, Migration 039)
 * filtert die Seite vorher heraus.
 */
export default function MaterialAccountsTable({
  accounts,
}: {
  accounts: MaterialAccount[];
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-primary mb-1">
        Schulen nur mit Schulungsmaterial ({accounts.length})
      </h2>
      <p className="text-sm text-text-light mb-4">
        Schulkonten ohne Bestandsaufnahme: Zugriff auf das Schulungsmaterial,
        aber keine Anträge und keine Best-Practice-Datenbank. „Bestätigt:
        Nein“ heißt, die Schule hat den Code aus der E-Mail noch nicht
        eingegeben und sich noch nie angemeldet.
      </p>
      {accounts.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-text-light">
              <tr>
                <th scope="col" className="py-2 pr-4 font-medium">Schule</th>
                <th scope="col" className="py-2 pr-4 font-medium">Ansprechperson</th>
                <th scope="col" className="py-2 pr-4 font-medium">E-Mail</th>
                <th scope="col" className="py-2 pr-4 font-medium">Registriert</th>
                <th scope="col" className="py-2 font-medium">Bestätigt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {accounts.map((a) => (
                <tr key={a.id}>
                  <td className="py-2 pr-4 text-text">{a.school}</td>
                  <td className="py-2 pr-4">{a.full_name}</td>
                  <td className="py-2 pr-4">{a.email}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    {new Date(a.created_at).toLocaleDateString("de-DE")}
                  </td>
                  <td className="py-2">{a.confirmed ? "Ja" : "Nein"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
