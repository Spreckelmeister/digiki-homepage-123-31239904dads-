// HTML-Schulungsmaterial als Strom ausliefern (siehe
// /schulungsmaterial/inhalt/[id]). Die Dateien sind teils zig MB groß
// (eingebettete Medien) – sie werden deshalb nie als Ganzes geladen, sondern
// Stück für Stück durchgereicht. So beginnt der Browser sofort mit der
// Anzeige, statt bis zum Ende der Übertragung eine leere Seite zu zeigen.

/** So weit vorn wird nach <head> bzw. <html> gesucht. */
const HEAD_SEARCH_BYTES = 64 * 1024;

/**
 * Stelle (in Bytes), an der das Skript eingefügt wird: direkt hinter <head>
 * bzw. <html>, sonst ganz vorn.
 */
function insertOffset(start: Uint8Array): number {
  // latin1: ein Zeichen je Byte, die Fundstelle ist also zugleich die Byte-Stelle.
  const text = new TextDecoder("latin1").decode(start);
  const tag = text.match(/<head[^>]*>/i) ?? text.match(/<html[^>]*>/i);
  return tag?.index !== undefined ? tag.index + tag[0].length : 0;
}

/**
 * Reicht `source` durch und fügt `insert` hinter dem öffnenden <head> ein.
 * Zurückgehalten wird nur der Dateianfang, bis die Stelle feststeht.
 */
export function streamWithInsert(
  source: ReadableStream<Uint8Array>,
  insert: Uint8Array
): ReadableStream<Uint8Array> {
  const reader = source.getReader();
  let inserted = false;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (inserted) {
        const { done, value } = await reader.read();
        if (done) controller.close();
        else controller.enqueue(value);
        return;
      }

      // Dateianfang sammeln, bis die Einfügestelle sicher darin liegt.
      const parts: Uint8Array[] = [];
      let length = 0;
      let ended = false;
      while (length < HEAD_SEARCH_BYTES) {
        const { done, value } = await reader.read();
        if (done) {
          ended = true;
          break;
        }
        parts.push(value);
        length += value.length;
      }
      const start = new Uint8Array(length);
      let position = 0;
      for (const part of parts) {
        start.set(part, position);
        position += part.length;
      }

      const at = insertOffset(start.subarray(0, HEAD_SEARCH_BYTES));
      if (at > 0) controller.enqueue(start.subarray(0, at));
      controller.enqueue(insert);
      if (at < start.length) controller.enqueue(start.subarray(at));
      inserted = true;
      if (ended) controller.close();
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}
