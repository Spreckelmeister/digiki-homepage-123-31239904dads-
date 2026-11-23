#!/bin/sh
# Richtet den Material-Server für die DigiKI-Seite ein (einmalig, als root).
# Wiederholbar: vorhandener Schlüssel und vorhandenes Material bleiben.
#
#   sh einrichten.sh        (im Ordner mit den Dateien dieses Verzeichnisses)
#
# Danach:
#   1. DNS: A-Eintrag material.digiki-os.de auf diesen Server, dann dieses
#      Skript noch einmal ausführen (bindet erst dann Caddy ein).
#   2. Schlüssel (cat /etc/digiki-material/schluessel) bei Vercel als
#      MATERIAL_HOST_SECRET eintragen.
#   3. Material ablegen: /srv/digiki/material/dateien/<ordner>/ (Ergebnis von
#      kurs-aufteilen.mjs), dann  digiki-material-links  ausführen.
set -eu
cd "$(dirname "$0")"

CADDY_MAIN=/etc/caddy/Caddyfile
CADDY_TEIL=/etc/caddy/digiki-material.caddy

install -d -m 755 /srv/digiki /srv/digiki/material /srv/digiki/material/dateien /srv/digiki/material/links
install -d -m 700 /etc/digiki-material
if [ ! -s /etc/digiki-material/schluessel ]; then
	(umask 077; od -An -N32 -tx1 /dev/urandom | tr -d ' \n' > /etc/digiki-material/schluessel)
	echo "Schlüssel angelegt: /etc/digiki-material/schluessel"
fi

install -m 755 digiki-material-links /usr/local/sbin/digiki-material-links
install -m 644 digiki-material-links.service digiki-material-links.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now digiki-material-links.timer
/usr/local/sbin/digiki-material-links

# Caddy erst einbinden, wenn der Name auf diesen Server zeigt – sonst scheitert
# das Zertifikat. Bis dahin ist alles andere fertig; danach erneut ausführen.
HOST=material.digiki-os.de
ZIEL="$(getent ahostsv4 "$HOST" | awk '{print $1; exit}')"
if [ -z "$ZIEL" ] || ! hostname -I | tr ' ' '\n' | grep -qxF "$ZIEL"; then
	echo "DNS fehlt noch: $HOST zeigt nicht auf diesen Server ($(hostname -I | awk '{print $1}'))."
	echo "Caddy-Teil übersprungen – nach dem DNS-Eintrag dieses Skript erneut ausführen."
	exit 0
fi

install -m 644 digiki-material.caddy "$CADDY_TEIL"
if ! grep -qF "import $CADDY_TEIL" "$CADDY_MAIN"; then
	cp -p "$CADDY_MAIN" "$CADDY_MAIN.vor-digiki-material"
	printf '\n# DigiKI-Schulungsmaterial (digiki-homepage, scripts/material-vps)\nimport %s\n' "$CADDY_TEIL" >> "$CADDY_MAIN"
fi
if caddy validate --config "$CADDY_MAIN" --adapter caddyfile >/dev/null 2>&1; then
	systemctl reload caddy
	echo "Caddy neu geladen."
else
	echo "Caddy-Konfiguration ungültig – nichts neu geladen. Prüfen: caddy validate --config $CADDY_MAIN" >&2
	exit 1
fi
