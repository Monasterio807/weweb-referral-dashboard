// =============================================================================
// e34-belohnung.test.mjs — E34 (Richard 13.11.2026) auf der Seite /empfehlen-dashboard
// (Pruefung P30, Fund F1). Laeuft mit node --test, ohne neue Abhaengigkeiten.
//
// Die Seite versprach «Für jeden Freund, der sich anmeldet und abonniert,
// erhältst du 1 Monat gratis». Laut Backend (imploya-supabase master) qualifiziert
// Anmelden und Abonnieren nichts; einen Gratismonat gibt es nur ueber eine
// Demo-Buchung, und die kann heute niemand machen.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const sfc = readFileSync(join(here, "..", "src", "wwElement.vue"), "utf8");
const template = sfc.slice(0, sfc.indexOf("<script>"));
const zaehle = (t) => template.split(t).length - 1;

test("E34: kein Gratismonat-Versprechen mehr", () => {
  assert.equal(zaehle("Empfehle imploya weiter und profitiere"), 0);
  assert.equal(zaehle("1 Monat gratis"), 0);
});

test("E34: Satz nach Canon steht genau einmal", () => {
  assert.equal(zaehle("Teile deinen persönlichen Link mit anderen Betrieben. Wir freuen uns über jede Empfehlung, auch wenn es dafür im Moment keinen Gratismonat gibt."), 1);
});

test("E34: kein ß im Template", () => {
  assert.equal(zaehle("ß"), 0);
});

// Canon-Hinweis P30: «Meldungen» in der Teilen-Mail meint Krank- und Unfallmeldung.
// Beide sind ausgeblendet (startseite DEFAULT_HIDDEN), Corina Karte 708 / Antwort 415:
// «überall herausnehmen, bis die Funktion sichtbar ist».
test("Teilen-Mail nennt keine Meldungen mehr", () => {
  assert.equal(sfc.split("Verträge, Zeugnisse, Meldungen").length - 1, 0);
  assert.equal(sfc.split("HR-Dokumente (Verträge, Zeugnisse).").length - 1, 1);
});
