// Speicher-Ersatz für HTML-Lerneinheiten. Bewusst ohne Importe: Diese Datei
// wird auch von scripts/material-vps/kurs-aufteilen.mjs gelesen.

/** Kennung der Nachrichten zwischen Lerneinheit und umgebender Seite. */
export const PROGRESS_MARKER = "__digikiMaterial";

// Im abgeschotteten Rahmen wirft schon der Zugriff auf localStorage /
// sessionStorage einen Fehler – viele Lerneinheiten merken sich dort den
// Fortschritt und würden abbrechen. Ersatz: ein Speicher im Arbeitsspeicher.
//
// Fortschritt je Konto (Migration 043): Der Ersatz für localStorage startet
// mit dem Stand, den die umgebende Seite im name-Attribut des Rahmens
// mitgibt (window.name – sofort da, steht nicht in der zwischengespeicherten
// Datei), und meldet jede Änderung per Nachricht an sie zurück. Sie prüft
// und speichert. Zusätzlich landet der Stand wieder in window.name, damit er
// ein Neuladen innerhalb des Rahmens übersteht. sessionStorage bleibt flüchtig.
//
// Zwischenablage („Prompt kopieren"): Im abgeschotteten Rahmen fehlt
// navigator.clipboard oder lehnt ab. Zweiter Teil des Skripts: Ersatz über
// document.execCommand("copy"), der dort funktioniert – auch in Rahmen, die
// die Lerneinheit in sich selbst öffnet (gleicher Ursprung, sobald geladen).
export const STORAGE_SHIM = `<script>(function(){var M="${PROGRESS_MARKER}";function mem(init,changed){var d=Object.create(null),k;if(init)for(k in init)if(typeof init[k]==="string")d[k]=init[k];function has(k){return Object.prototype.hasOwnProperty.call(d,k)}function tell(){if(changed)changed(d)}return{getItem:function(k){return has(k)?d[k]:null},setItem:function(k,v){d[k]=String(v);tell()},removeItem:function(k){delete d[k];tell()},clear:function(){d=Object.create(null);tell()},key:function(i){return Object.keys(d)[i]||null},get length(){return Object.keys(d).length}}}var init=null;try{var n=JSON.parse(window.name);if(n&&n[M]===1&&n.ls&&typeof n.ls==="object")init=n.ls}catch(e){}function changed(d){var c={},k,m={type:"storage"};for(k in d)c[k]=d[k];m[M]=1;m.data=c;try{var w={ls:c};w[M]=1;window.name=JSON.stringify(w)}catch(e){}try{if(window.parent!==window)window.parent.postMessage(m,"*")}catch(e){}}["localStorage","sessionStorage"].forEach(function(n){try{window[n].getItem("_")}catch(e){try{Object.defineProperty(window,n,{value:n==="localStorage"?mem(init,changed):mem(),configurable:true})}catch(_){}}})})();(function(){function zwischenablage(w){try{if(w.__digikiKopie)return;w.__digikiKopie=1;var d=w.document,n=w.navigator;var ersatz=function(t){return new w.Promise(function(ok,nein){try{var a=d.createElement("textarea"),f=d.activeElement;a.value=String(t);a.setAttribute("readonly","");a.style.cssText="position:fixed;top:0;left:0;width:1px;height:1px;opacity:0";(d.body||d.documentElement).appendChild(a);a.select();a.setSelectionRange(0,a.value.length);var r=d.execCommand("copy");a.remove();try{if(f&&f.focus)f.focus({preventScroll:true})}catch(e){}r?ok():nein(new w.DOMException("Kopieren nicht möglich","NotAllowedError"))}catch(e){nein(e)}})};var c=n.clipboard;if(!c){Object.defineProperty(n,"clipboard",{value:{writeText:ersatz},configurable:true})}else{var alt=c.writeText.bind(c);c.writeText=function(t){return alt(t).catch(function(){return ersatz(t)})}}}catch(e){}}function rahmen(w){zwischenablage(w);try{w.document.addEventListener("load",function(e){var t=e.target;if(t&&t.tagName==="IFRAME"){try{if(t.contentWindow&&t.contentWindow.document)rahmen(t.contentWindow)}catch(_){}}},true)}catch(e){}}rahmen(window)})();</script>`;
