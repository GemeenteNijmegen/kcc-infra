# ICATT feedback — voorstel ticketverdeling

Bron: [context.md](./context.md) (mailwisseling Nijmegen/ICATT + bestaande puntenlijsten).
Elk item hieronder is bedoeld als los ticket, gegroepeerd onder een epic/thema. Labels:
`Beantwoord` · `Open vraag (ICATT)` · `Ontwikkelwens` · `Bug` · `Intern`

Duplicaten uit de twee brontails (Nijmegen-mail en ICATT-antwoord) zijn samengevoegd tot één ticket.

## Overzicht thema's

| Epic | # tickets | Voornamelijk |
|---|---|---|
| Zaken | 4 | Bug/Ontwikkelwens |
| Contactmomenten | 12 | Ontwikkelwens (deels beantwoord) |
| Nieuwsberichten & werkinstructies | 3 | Ontwikkelwens |
| ITA | 8 | Ontwikkelwens |
| Styling | 2 | Ontwikkelwens (deels beantwoord) |
| Techniek / versies | 2 | Open vraag / Bug (upstream) |
| Intern (DevOps) | 2 | Status-check |

Totaal: 33 tickets over 7 epics.

---

## Epic: Zaken

**Z1 — Onderwerp van de zaak niet zichtbaar in overzicht**
Alleen het programma waarin de zaak is aangemaakt is zichtbaar, niet waar de zaak inhoudelijk over gaat. Medewerker moet de zaak openen om te zien dat het bv. een subsidieaanvraag betreft — vertraagt telefonisch zoeken naar de juiste zaak.
Label: `Ontwikkelwens`

**Z2 — Ontbrekende (indien)datum bij zaken**
Niet bij alle zaken wordt een datum getoond.
Label: `Ontwikkelwens`

**Z3 — Onduidelijke statustermen ('verzonden', 'start status')**
Onduidelijk of deze termen uit het onderliggende zaaksysteem komen of door KISS bepaald worden.
Label: `Open vraag (ICATT)`

**Z4 — Wisselende/lange laadtijd bij veel lopende zaken**
Laadtijd is inconsistent: soms snel, soms traag bij herhaald proberen. Technische achtergrond: relatief veel losse calls per zaak vanuit de frontend naar de ZGW-APIs.
Onderzoekspunten (al benoemd door ICATT):
- Zou caching in KISS moeten worden toegepast?
- Kan de expand-functionaliteit van de ZGW-APIs gebruikt worden om het aantal calls te verlagen?
- Let op: OpenZaak werkt aan "convenience endpoints", maar KISS kan niet OpenZaak-specifiek ontwikkelen.
Dit is dezelfde melding als DevOps-punt 1 — niet dupliceren, hier bijhouden.
Label: `Bug` / `Ontwikkelwens` (performance)

---

## Epic: Contactmomenten

**C1 — Nummering van contactmomenten zichtbaar maken in overzicht**
Contactmomenten worden intern al genummerd, maar dit nummer is niet zichtbaar in het contactmomenten-overzicht (wel gewenst, vergelijkbaar met Tribe).
Label: `Ontwikkelwens`

**C2 — Exportmogelijkheid voor contactverzoeken**
Geen optie gevonden om contactverzoek-informatie te exporteren.
Label: `Open vraag (ICATT)`

**C3 — Verschil contactmomenten vs. contactverzoeken in klantkaart verduidelijken**
Twee overzichten met verschillende hoeveelheid informatie (bv. bij klant "Boeddhoe") — verwarrend.
Label: `Open vraag (ICATT)`

**C4 — 'Telefoonnummer 1' verplicht veld (zonder zichtbare *)**
Beantwoord: klopt, e-mail óf telefoon is verplicht; het ontbreken van de * is een weergave-detail, geen bug.
Label: `Beantwoord` — kan als toelichting/documentatie-ticket gesloten worden, tenzij de UI (missende *) alsnog aangepast moet worden.

**C5 — 'Interne toelichting voor medewerker' niet verplicht maken**
Nu verplicht bij aanmaken contactverzoek. ICATT geeft aan dat dit in overleg met PO Marius aangepast kan worden.
Label: `Ontwikkelwens` (vraagt PO-afstemming)

**C6 — Volgorde 'Kanaal'-veld: 'Telefoon' bovenaan**
Veld is nu alfabetisch geordend; vaste of aanpasbare volgorde is een ontwikkelwens, aan te dragen bij PO Marius. Noot: sessie onthoudt wel laatst gebruikte keuze.
Label: `Ontwikkelwens`

**C7 — Termen onder 'Afhandeling' aanpasbaar maken**
Grotendeels al beantwoord: instelbaar via Beheer > 'Gespreksresultaat', behalve "Contactverzoek maken" (hardcoded, noodzakelijk voor functionaliteit).
Label: `Beantwoord` — evt. restpunt: is dit voldoende duidelijk gedocumenteerd voor beheerders?

**C8 — Tribe-achtige 'fase' toevoegen aan contactverzoek-status in KISS**
Bijv. 'terugbelnotitie naar backoffice', 'doorverbonden', 'afgehandeld maar klant belt terug'. Status-veld is nu een vaste enum (2 waarden) vanuit de OpenKlant-standaard.
Let op: raakt de bredere Contactverzoek/Interne taak/Zaak-discussie binnen Dimpact/CG.
Label: `Ontwikkelwens` (Open Klant, groter/architectuur-punt)

**C9 — Dubbele invoer voorkomen: Notitie/Kladblok vs. Interne toelichting**
Inhoud van het Kladblok wordt bij overstap naar tab Contactverzoek gekopieerd naar Notities, maar loopt daarna uit elkaar — latere aanpassingen moeten dubbel gedaan worden. ICATT overweegt dit gedrag te herzien.
Label: `Ontwikkelwens`

**C10 — Term 'afronden' aanpasbaar maken in contactverzoek-scherm**
Label: `Ontwikkelwens`

**C11 — Auto-vullen klantgegevens bij gecombineerde KVK+BRP-zoekactie**
Als zowel bedrijf (KVK) als inwoner (BRP) gevonden zijn, moet je er 1 selecteren bij 'afhandeling' > 'klanten', maar de juiste gegevens worden niet automatisch bijgewerkt. Gedrag hangt af van het moment waarop het contactverzoek gestart wordt t.o.v. het openen van het klantbeeld.
Label: `Ontwikkelwens` (ook gemeld door andere Dimpact-gemeenten)

**C12 — KVK/NAW-gegevens behouden zichtbaar tijdens afhandelen (ondernemers)**
Bij een contactverzoek gekoppeld aan KVK-gegevens is na koppeling alleen nog de bedrijfsnaam zichtbaar; KVK/NAW-details verdwijnen, terwijl dit als laatste check voor verzenden handig zou zijn.
Workaround: gegevens invullen terwijl je nog in het klantbeeld zit.
Label: `Ontwikkelwens`

---

## Epic: Nieuwsberichten & werkinstructies

**N1 — Publicatiedatum optioneel maken**
Soms wil je een bericht klaarzetten zonder specifieke publicatiedatum. Let op ICATT's randvoorwaarde: hier moet consensus over zijn, want een lege publicatiedatum zou kunnen betekenen "bericht nooit zichtbaar" — impact op bestaand gedrag.
Label: `Ontwikkelwens`

**N2 — Einddatum optioneel maken**
Nu verplicht, standaard 1 jaar vooruit. Niet elke instructie heeft een zinvolle einddatum.
Achtergrond: bewuste keuze vanuit Gebruikersgroep (i.p.v. 10 of 100 jaar) omdat berichten na 1 jaar sowieso herzien zouden moeten worden — bij het ticket vermelden zodat de discussie niet opnieuw vanaf nul gevoerd wordt.
Label: `Ontwikkelwens`

**N3 — Teller 'Nieuws en werkinstructies': totaal i.p.v. alleen 'belangrijk', + refresh-gedrag**
Gewenst: totaal aantal openstaande berichten zichtbaar, niet alleen 'belangrijke'. ICATT geeft aan dat de teller wel elke 30 sec. + bij focus ververst wanneer een belangrijk bericht als gelezen wordt gezet — waard om te verifiëren of de klacht nog actueel is of dat het puur om de "totaal i.p.v. alleen belangrijk"-wens gaat.
Label: `Ontwikkelwens` / verificatie

---

## Epic: ITA

**I1 — Zoekbalk/filter toevoegen aan contactverzoeken-overzicht**
Ontbreekt volledig; gewenst op nummer, naam, afdeling, etc.
Label: `Ontwikkelwens`

**I2 — Afgeronde/verwerkte contactverzoeken zichtbaar maken in overzicht**
Nu niet zichtbaar in het algemene overzicht.
Label: `Ontwikkelwens`

**I3 — Contactmoment afgehandeld vanuit algemene voorraad zichtbaar maken in eigen historie**
Bij afhandelen vanuit groeps-/afdelingsvoorraad (zonder eerst toe te wijzen aan jezelf) komt het contactmoment alleen in de afdelingshistorie terecht, niet in de eigen historie.
Label: `Bug` / `Ontwikkelwens`

**I4 — Medewerker-selectie bij doorzetten van contactverzoek**
Nu kan alleen een e-mailadres ingevuld worden bij doorzetten naar een medewerker; gewenst is dezelfde medewerker-selectie als bij het aanmaken van een contactverzoek.
Label: `Ontwikkelwens`

**I5 — Algemeen filteren en zoeken in ITA verbeteren**
Overlapt mogelijk met I1 — bij ticket-aanmaak beoordelen of dit een apart, breder punt is of samengevoegd kan worden.
Label: `Ontwikkelwens` (mogelijk duplicaat van I1)

**I6 — Kopje 'Notitie' hernoemen naar 'Informatie voor burger/bedrijf'**
Huidige kopje bij aanmaken contactverzoek sluit niet aan bij het kopje 'Informatie voor burger/bedrijf' dat elders getoond wordt.
Label: `Ontwikkelwens` (kleine UX/terminologie-wijziging)

**I7 — Reminders bij niet-afgehandelde contactverzoeken**
Label: `Ontwikkelwens`

**I8 — Oplossing voor Out-of-Office / bounce-afhandeling**
No-reply-mechanisme zodat bounces (bv. bij afwezigheid medewerker) ergens landen i.p.v. verloren te gaan.
Label: `Ontwikkelwens`

---

## Epic: Styling

**S1 — Skills-widget minder prominent in nieuwsoverzicht**
Label: `Ontwikkelwens`

**S2 — Invloed op styling (NLDS-support)**
Deels beantwoord: nieuw design voor Nieuws en Werkinstructies is onderweg met (minimale) NLDS-toepassing. Verdergaande wensen zijn een aparte ontwikkelwens.
Label: `Beantwoord` (deels) + `Ontwikkelwens` (vervolg, indien gewenst na nieuw design)

---

## Epic: Techniek / versies

**T1 — Open Object 4.0.x: UUID-in-body bug bij aanpassen VAC's**
Bekende bug in Open Object 4.0.x, wordt opgelost via upstream issue [maykinmedia/open-object#765](https://github.com/maykinmedia/open-object/issues/765). Voorstel: ticket puur om de upstream-fix te volgen en te verifiëren na release, geen eigen ontwikkelwerk.
Label: `Bug` (upstream, tracking-only)

**T2 — Versiecompatibiliteit: Elastic vs. Enterprise Search (EOL in 9.x)**
Open vraag aan ICATT: hoe gaan zij om met de aankomende EOL van Enterprise Search in versie 9.x, en welk pad (bv. migratie naar Elastic) wordt ondersteund?
Label: `Open vraag (ICATT)`

**T3 — Open Object 4.0 upgrade: functionele impact op KISS/ITA**
Open Object 4.0 combineert Objects API en Objecttypes API in één installatie; mogelijk functionele wijzigingen nodig in KISS/ITA. Wordt onderzocht en besproken met Marius (PO KISS) — "wordt vervolgd" volgens ICATT's eerste mail.
Label: `Open vraag (ICATT)` — check voortgang bij ICATT

---

## Epic: Intern (DevOps) — statuscontrole

**D1 — Zaken laadtijd**
Zie **Z4** — zelfde melding, niet dupliceren.

**D2 — Contactmomenten opzoeken/aanpassen als beheerder zonder nieuw aan te maken**
Gemeld als afgerond: functionaliteit zit in ITA. Voorstel: sluiten na korte verificatie dat dit voor het team werkt zoals verwacht.
Label: `Intern` — verificatie, daarna sluiten

**D3 — Zoeken uitbreiden naar afdeling/datum/medewerker**
Deels opgelost: KISS ondersteunt telefoon/e-mail; ITA ondersteunt afdeling/datum/medewerker voor beheerders. Voor reguliere medewerkers is dit beperkt tot eigen afdeling/groep/werkvoorraad.
Voorstel: sluiten als dit voor het team voldoende is, anders ombuigen naar een gerichte ontwikkelwens (bv. "medewerker mag ook buiten eigen werkvoorraad zoeken binnen randvoorwaarden X").
Label: `Intern` — verificatie / evt. omzetten naar `Ontwikkelwens`

---

## Suggestie voor labels/velden in de tracker

Naast het epic/thema, twee losse velden per ticket:
- **Categorie**: `Beantwoord` / `Open vraag (ICATT)` / `Ontwikkelwens` / `Bug` / `Intern`
- **Bron**: link naar de regel(s) in `context.md`, zodat de oorspronkelijke mailwisseling terug te vinden blijft zonder deze in elk ticket te dupliceren.
