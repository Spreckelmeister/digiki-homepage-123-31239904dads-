import { useState } from "react";

/**
 * Honeypot spam protection for public forms.
 * Renders a hidden field that only bots fill out.
 * Use the `isSpam` function to check before submitting.
 */
export function useHoneypot() {
  const [honeypot, setHoneypot] = useState("");

  const isSpam = honeypot.length > 0;

  const HoneypotField = (
    <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
      <label htmlFor="website_url">Website</label>
      <input
        id="website_url"
        name="website_url"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
      />
    </div>
  );

  return { isSpam, HoneypotField };
}
