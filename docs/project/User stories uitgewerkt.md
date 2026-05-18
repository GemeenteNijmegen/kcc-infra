# User Stories

## Fase 2 – KISS

---

### [UserStory] Inloggen als KCC medewerker

**Als** KCC medewerker  
**wil ik** kunnen inloggen in KISS met mijn medewerkers­account  
**zodat** ik toegang heb tot de functionaliteit die bij mijn rol past.

**Acceptatiecriteria:**
- Ik kan inloggen met mijn organisatie­account (via entra ID)
- Bij onjuiste inloggegevens krijg ik een duidelijke foutmelding
- Na inloggen zie ik het KCC medewerker­dashboard
- Ik heb geen toegang tot supervisor­functionaliteit

**Technische refinement aantekeningen:**
(aantekeningen bij technische implementatie in te vullen door DevOps)

---

### [UserStory] Contactverzoek vastleggen voor een inwoner

**Als** KCC medewerker  
**wil ik** een contactverzoek kunnen vastleggen voor een inwoner  
**zodat** het contact traceerbaar is en opgevolgd kan worden.

**Acceptatiecriteria:**
- Ik kan een contactverzoek aanmaken en koppelen aan een inwoner (BSN of NAW)
- Ik kan het kanaal, onderwerp en omschrijving vastleggen
- Het contactverzoek wordt opgeslagen met datum, tijd en mijn medewerkersnaam
- Ik krijg een bevestiging na opslaan

**Technische refinement aantekeningen:**
(aantekeningen bij technische implementatie in te vullen door DevOps)

---

### [UserStory] Contactverzoek vastleggen voor een ondernemer

**Als** KCC medewerker  
**wil ik** een contactverzoek kunnen vastleggen voor een ondernemer  
**zodat** ook zakelijk contact traceerbaar is en opgevolgd kan worden.

**Acceptatiecriteria:**
- Ik kan een contactverzoek aanmaken en koppelen aan een ondernemer (KVK-nummer of bedrijfsnaam)
- Ik kan het kanaal, onderwerp en omschrijving vastleggen
- Het contactverzoek wordt opgeslagen met datum, tijd en mijn medewerkersnaam
- Ik krijg een bevestiging na opslaan

**Technische refinement aantekeningen:**
(aantekeningen bij technische implementatie in te vullen door DevOps)

---

### [UserStory] Contactverzoek terugvinden

**Als** KCC medewerker  
**wil ik** een eerder vastgelegd contactverzoek kunnen terugvinden  
**zodat** ik snel de juiste informatie bij de hand heb tijdens een volgend contact.

**Acceptatiecriteria:**
- Ik kan zoeken op naam, BSN, KVK-nummer
- Zoekresultaten tonen relevante metadata (datum, kanaal, medewerker, status)
- Ik kan een contactverzoek openen en de volledige details inzien
- Zoeken geeft resultaat binnen acceptabele responstijd (aanname: < 2 seconden)

**Technische refinement aantekeningen:**
(aantekeningen bij technische implementatie in te vullen door DevOps)

---

### [UserStory] Zoeken op zaken

**Als** KCC medewerker  
**wil ik** kunnen zoeken op zaken  
**zodat** ik een inwoner of ondernemer snel kan informeren over de status van hun zaak.

**Acceptatiecriteria:**
- Ik kan zoeken op zaaknummer, naam of BSN/KVK
- Zoekresultaten tonen zaaktype, status en behandelaar
- Ik kan de zaakdetails inzien vanuit het zoekresultaat

**Technische refinement aantekeningen:**
(aantekeningen bij technische implementatie in te vullen door DevOps)

---

### [UserStory] Afdelingen en groepen zoeken en inzien

**Als** KCC medewerker  
**wil ik** afdelingen en groepen kunnen zoeken en inzien  
**zodat** ik een contactverzoek of vraag kan doorzetten naar de juiste plek in de organisatie.

**Acceptatiecriteria:**
- Ik kan zoeken op naam van een afdeling of groep
- Ik zie contactgegevens en eventuele aanvullende informatie per afdeling/groep
- De lijst is actueel (beheerd door de supervisor)

**Technische refinement aantekeningen:**
(aantekeningen bij technische implementatie in te vullen door DevOps)

---

### [UserStory] Inloggen als KCC supervisor

**Als** KCC supervisor  
**wil ik** kunnen inloggen in KISS met mijn supervisor­account  
**zodat** ik toegang heb tot beheerfunctionaliteit.

**Acceptatiecriteria:**
- Ik kan inloggen met mijn organisatie­account (bijv. via SSO/Azure AD)
- Na inloggen zie ik het supervisor­dashboard met beheerfuncties
- Medewerkers zonder supervisor­rol hebben geen toegang tot dit dashboard

**Technische refinement aantekeningen:**
(aantekeningen bij technische implementatie in te vullen door DevOps)

---

### [UserStory] Nieuwsberichten en werkinstructies publiceren

**Als** KCC supervisor  
**wil ik** nieuwsberichten en instructies kunnen publiceren  
**zodat** KCC medewerkers snel op de hoogte zijn van relevante ontwikkelingen.

**Acceptatiecriteria:**
- Ik kan nieuwsberichten en werkinstructies aanmaken met titel, inhoud en publicatiedatum
- Gepubliceerde berichten zijn zichtbaar voor alle KCC medewerkers
- Ik kan een bericht bewerken of verwijderen

**Technische refinement aantekeningen:**
(aantekeningen bij technische implementatie in te vullen door DevOps)

---


### [UserStory] Skills (themas), kanalen en links beheren

**Als** KCC supervisor  
**wil ik** skills, kanalen en links kunnen beheren  
**zodat** KCC medewerkers een inrichting passend bij de organisatie in KISS zien.

**Acceptatiecriteria:**
- Ik kan skills aanmaken, bewerken en verwijderen
- Nieuwberichten of werkinstructies zijn koppelbaar aan de skills
- Ik kan kanalen aanmaken, bewerken en verwijderen
- Kanalen zijn beschikbaar als selectie­optie bij het vastleggen van contactverzoeken
- Ik kan links aanmaken met een titel, URL en eventuele categorisering
- Links zijn zichtbaar en doorzoekbaar voor KCC medewerkers
- Wijzigingen zijn direct actief in het systeem

**Technische refinement aantekeningen:**
(aantekeningen bij technische implementatie in te vullen door DevOps)

---

### [UserStory] Vraag-Antwoord-Combinaties (VACs) beheren

**Als** KCC supervisor  
**wil ik** VACs beheren  
**zodat** KCC medewerkers kunnen zoeken op standaard vragen en bijbehordene antwoorden.

**Acceptatiecriteria:**
- KCC medewerkers kunnen VACs inzien
- KCC supervisor kan VACs toevoegen, aanpassen en verwijderen.

> ⚠️ **Aandachtspunt:** Zoeken kan enkel via `Ctrl + f`.


**Technische refinement aantekeningen:**
(aantekeningen bij technische implementatie in te vullen door DevOps)

---

### [UserStory] Rapportages inzien (PM)

**Als** KCC supervisor  
**wil ik** rapportages kunnen inzien over contactverzoeken en KCC-activiteit  
**zodat** ik inzicht heb in werkvolume, trends en prestaties van het KCC.

**Acceptatiecriteria:**
- PM *(nog te specificeren)*

> ⚠️ **Aandachtspunt:** Deze story is nog niet uitgewerkt. Stem af welke rapportages
> gewenst zijn, over welke periode, en wie toegang heeft. 
> Let op: KISS heeft hier enkel en [API endpoint voor](https://klantinteractie-servicesysteem.readthedocs.io/en/v1.1.0/manual/managementinformatie.html)

**Technische refinement aantekeningen:**
(aantekeningen bij technische implementatie in te vullen door DevOps)

---

## Fase 3 – ITA

---

### US-14 – Terugbelverzoek maken voor een medewerker

**Als** KCC medewerker  
**wil ik** een terugbelverzoek kunnen aanmaken voor een specifieke medewerker  
**zodat** een inwoner of ondernemer teruggebeld wordt door de juiste persoon.

**Acceptatiecriteria:**
- Ik kan een medewerker opzoeken en selecteren
- Ik kan een terugbelverzoek aanmaken met naam, telefoonnummer, onderwerp en
  gewenst tijdstip (indien van toepassing)
- Het terugbelverzoek is zichtbaar voor de betreffende medewerker in ITA
- Ik ontvang een bevestiging na aanmaken

---

### US-15 – Terugbelverzoek maken voor een afdeling

**Als** KCC medewerker  
**wil ik** een terugbelverzoek kunnen aanmaken voor een afdeling  
**zodat** de afdeling zelf kan bepalen wie het verzoek oppakt.

**Acceptatiecriteria:**
- Ik kan een afdeling opzoeken en selecteren
- Ik kan een terugbelverzoek aanmaken met naam, telefoonnummer en onderwerp
- Het terugbelverzoek is zichtbaar voor de afdeling in ITA
- Ik ontvang een bevestiging na aanmaken

---

### US-16 – Terugbelverzoek maken voor een team (groep)

**Als** KCC medewerker  
**wil ik** een terugbelverzoek kunnen aanmaken voor een team of groep  
**zodat** het verzoek bij de juiste groep medewerkers terechtkomt.

**Acceptatiecriteria:**
- Ik kan een team/groep opzoeken en selecteren
- Ik kan een terugbelverzoek aanmaken met naam, telefoonnummer en onderwerp
- Het terugbelverzoek is zichtbaar voor het team in ITA
- Ik ontvang een bevestiging na aanmaken

---

### US-17 – Inloggen bij ITA als medewerker

**Als** medewerker  
**wil ik** kunnen inloggen bij ITA  
**zodat** ik mijn terugbelverzoeken kan inzien en afhandelen.

**Acceptatiecriteria:**
- Ik kan inloggen met mijn organisatie­account (bijv. via SSO/Azure AD)
- Na inloggen zie ik mijn openstaande terugbelverzoeken
- Ik heb alleen toegang tot verzoeken die aan mij, mijn afdeling of mijn team
  zijn toegewezen

---

### US-18 – Notificaties ontvangen van een terugbelverzoek

**Als** medewerker  
**wil ik** een notificatie ontvangen wanneer er een terugbelverzoek voor mij klaarstaat  
**zodat** ik tijdig actie kan ondernemen.

**Acceptatiecriteria:**
- Ik ontvang een notificatie (e-mail en/of in-app) bij een nieuw terugbelverzoek
- De notificatie bevat de naam, het telefoonnummer en het onderwerp
- Ik kan via de notificatie direct doorklikken naar het verzoek in ITA

> ℹ️ **Aanname:** Het notificatiekanaal (e-mail, Teams, in-app) is nog niet
> gespecificeerd. Stem dit af met de technisch beheerder en de gebruikers.

---

### US-19 – Terugbelverzoek afhandelen in ITA

**Als** medewerker  
**wil ik** een terugbelverzoek kunnen afhandelen in ITA  
**zodat** het verzoek administratief wordt afgesloten na contact.

**Acceptatiecriteria:**
- Ik kan een terugbelverzoek openen en de details inzien
- Ik kan het verzoek markeren als afgehandeld, met optionele notitie
- Afgehandelde verzoeken verdwijnen uit mijn actieve lijst
- De afhandeling wordt gelogd met datum, tijd en mijn naam

---

## Fase 4 – Kennisbank en website

---

### US-20 – Zoeken in de kennisbank

**Als** KCC medewerker  
**wil ik** eenvoudig kunnen zoeken in de kennisbank  
**zodat** ik snel het juiste antwoord of de juiste werkinstructie vind tijdens een klantcontact.

**Acceptatiecriteria:**
- Ik kan zoeken op trefwoord(en)
- Zoekresultaten zijn relevant en worden getoond op volgorde van relevantie
- Ik kan een kennisbank­artikel openen en volledig lezen
- Zoeken geeft resultaat binnen acceptabele responstijd (aanname: < 2 seconden)
- De kennisbank is bereikbaar vanuit het KISS-dashboard

---

### US-21 – Zoeken op de website

**Als** KCC medewerker  
**wil ik** eenvoudig kunnen zoeken op de gemeentelijke website  
**zodat** ik snel gemeentelijke informatie kan vinden en delen met een inwoner of ondernemer.

**Acceptatiecriteria:**
- Ik kan zoeken op trefwoord(en)
- Zoekresultaten tonen de paginatitel, een korte omschrijving en een directe link
- Ik kan een pagina openen (in nieuw tabblad)
- De zoekfunctie is bereikbaar vanuit het KISS-dashboard

> ℹ️ **Aanname:** De websitezoekfunctie is geïntegreerd in KISS via een koppeling
> met de gemeentelijke website (bijv. via een zoek-API). Controleer of deze
> koppeling technisch beschikbaar is.