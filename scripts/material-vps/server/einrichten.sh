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
#      kurs-aufteilen.mjs). Mehr ist nicht nötig.
#
# Abrufe nachsehen: /var/log/digiki-material/zugriffe-JJJJ-MM-TT.log
# (Zeit, Ergebnis, Konto-ID, Ordner, Datei). Die Konto-ID steht in der
# Datenbank der DigiKI-Seite in profiles.id (dort mit Bindestrichen).
set -eu
cd "$(dirname "$0")"

CADDY_MAIN=/etc/caddy/Caddyfile
CADDY_TEIL=/etc/caddy/digiki-material.caddy

install -d -m 755 /srv/digiki /srv/digiki/material /srv/digiki/material/dateien
install -d -m 700 /etc/digiki-material
if [ ! -s /etc/digiki-material/schluessel ]; then
	(umask 077; od -An -N32 -tx1 /dev/urandom | tr -d ' \n' > /etc/digiki-material/schluessel)
	echo "Schlüssel angelegt: /etc/digiki-material/schluessel"
fi

# Früherer Aufbau (täglich wechselnde Verweise) – abgelöst durch den Prüfdienst.
if [ -e /etc/systemd/system/digiki-material-links.timer ]; then
	systemctl disable --now digiki-material-links.timer >/dev/null 2>&1 || true
	rm -f /etc/systemd/system/digiki-material-links.timer /etc/systemd/system/digiki-material-links.service /usr/local/sbin/digiki-material-links
fi
if [ -d /srv/digiki/material/links ]; then
	find /srv/digiki/material/links -maxdepth 1 -type l -delete
	rmdir /srv/digiki/material/links 2>/dev/null || true
fi

install -m 755 digiki-material-pruefung /usr/local/sbin/digiki-material-pruefung
install -m 644 digiki-material-pruefung.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable digiki-material-pruefung.service >/dev/null 2>&1
systemctl restart digiki-material-pruefung.service
sleep 1
systemctl is-active --quiet digiki-material-pruefung.service || { echo "Prüfdienst läuft nicht: journalctl -u digiki-material-pruefung" >&2; exit 1; }
echo "Prüfdienst läuft."

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
