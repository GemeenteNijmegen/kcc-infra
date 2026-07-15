# Vragen/antwoorden met ICATT


## Mailwisseling met aantal vragen en antwoorden van ons aan ICATT
```
Goedemiddag Joost,

Bij deze in cursief de antwoorden op je vragen:
Aanpassen VACS gekoppeld aan open object versie 4.0.x
Open Object 4.0 is de opvolger van Objects API en Objecttypes API, waarbij beide API’s in 1 installatie terecht komen. Mogelijk zijn door deze upgrade (functionele) wijzigingen in KISS/ ITA nodig. Dit moet verder onderzocht worden. Dit gaat door ons besproken worden met Marius, de PO van KISS, dus wordt vervolgd.

Contactmomenten
'Telefoonnummer 1' verplicht veld maken (er staat geen * bij) <- Aanname: E-mail óf telefoon is verplicht, dat zal de reden zijn?
Ja, dit klopt.
Interne toelichting voor medewerker' niet verplicht maken <- Aanname: deze is noodzakelijk voor het bericht aan medewerker?
Op dit moment is het bij het maken van een contactverzoek verplicht om een interne toelichting voor de medewerker toe te voegen. Uiteraard is dit in overleg met de PO te veranderen in een niet-verplicht veld. 
Kan de optie 'Telefoon' in het veld 'Kanaal' bovenaan komen bij het maken van een contactmoment? Kunnen wij de volgorde veranderen hiervan, nu is het alfabetisch.
Dit kan nu niet, maar zou ontwikkeld kunnen worden, waar mogelijk breder vraag naar is. Dit kunnen jullie aandragen bij de PO Marius.
Het is wel zo dat hij onthoudt wat je de laatste keer gebruikt hebt binnen de sessie van KISS. Dus als je achter de telefoon zit, hoef je niet steeds opnieuw telefoon te selecteren. 
Kunnen de termen onder 'Afhandeling' aangepast worden? Nu staat er contactverzoek maken en genegeerd.
De termen onder afhandeling zijn instelbaar bij Beheer, onder de lijst ‘Gespreksresultaat’. Uitzondering hierop is Contactverzoek maken. Die staat hard in de code, omdat deze noodzakelijk is voor de Contactverzoekfunctionaliteit, daarvan wil je niet dat een wijziging door een beheerder alles stukmaakt.
In Tribe kunnen wij nu aangeven in welke 'fase' een contactverzoek zit. Bijvoorbeeld 'terugbelnotitie naar backoffice', 'doorverbonden', 'afgehandeld', 'afgehandeld maar klant belt terug'. Kunnen we dit ook toevoegen in KISS? Of zit dit in de samenwerking met ITA?
Contactverzoek is qua waarde van het veld Status afhankelijk van de standaard zoals die in OpenKlant is opgenomen. Daar staat dat het een enum is met twee waarden.
Image
Samengevat: dit is een doorontwikkelwens voor Open Klant. Let op, dit relateert aan de Contactverzoek/ Interne taak/ Zaak discussie binnen CG. 
Wanneer je een contactverzoek wil afhandelen en je hebt dingen in je 'notities' gezet, dan komt deze tijdens het afhandelen zowel bij 'Notitie' onder het kopje 'Details' te staan, als bij een contactverzoek onder 'Interne toelichting voor medewerker'. Als ik dan nog iets moet aanpassen, moet ik dit dubbel doen. Kunnen we dit voorkomen?
Op dit moment niet, maar er is spraken van dat de werking mogelijk herzien gaat worden. Voor de volledigheid, de werking is:
Bij start Contactmoment ga je typen in het Kladblok.
Zodra je overgaat naar de tab Contactverzoek wordt de inhoud van het Kladblok meegenomen naar het veld Notities.
Vanaf dat moment gaan ze ‘uit elkaar lopen’. Wat je dan nog aanvult in Notities wordt niet meer meegenomen in Kladblok en vice versa.
Kunnen we de term 'afronden' aanpassen in het scherm als je een contactverzoek maakt?
Op dit moment niet. Dit is een doorontwikkelwens.
Als je zowel in de KVK hebt gezocht als in de BRP dan komen zowel bedrijf als inwoner bij 'afhandeling' onder 'klanten' te staan. Je moet er dan 1 selecteren, maar dan vult die niet automatisch de goede gegevens van degene die je selecteert.
We nemen aan dat dit gaat over de gegevens in het Contactverzoek formulier. Dit worden niet meer ‘bijgewerkt’ inderdaad. De werking is:
Als je een contactverzoek start vanuit het klantbeeld van een Persoon of Bedrijf, worden de bekende contactgegevens voor ingevuld.
Als je daarna naar Klantbeeld van een ander Persoon/Bedrijf gaat, wordt dit niet meer bijgewerkt.
Als je een contactverzoek start, en je opent pas daarna het klantbeeld, dan worden de bekende contactgegevens NIET voor ingevuld
Over deze werking zijn ook al vragen/wensen naar voren gekomen vanuit de Dimpact gemeenten.


 Specifiek voor ondernemers

Wanneer je een contactverzoek maakt voor een bedrijf (dus in het afhandel gedeelte zit), en je hebt deze gekoppeld aan de KVK-gegevens, dan zie je alleen de naam van het bedrijf nog staan. De KVK/NAW gegevens zijn verdwenen. Dit is wel fijn om in beeld te hebben als laatste check voordat je een contactverzoek verzendt.

Dit is ook een doorontwikkelwens. Tip: als je in het contactverzoek invult terwijl je nog in het Klantbeeld zit, heb je die gegevens wel in beeld/ meer bij de hand.
Nieuwsberichten
Publicatiedatum leeglaten kan niet. Soms zetten wij wel iets klaar zonder dat er al een specifieke publicatiedatum bekend is, dan willen we dit nog leeg kunnen laten. Einddatum is verplicht. Maar niet elke instructie heeft een einddatum, kunnen we dit leeglaten?
Publicatiedatum en einddatum zijn nodig om te bepalen of een bericht getoond moet worden ja/nee. Ten aanzien van het leeglaten: dat is wellicht technisch mogelijk, maar dan moet iedereen het er wel over eens zijn dat: Lege Publicatiedatum > Bericht Nooit Zichtbaar.
Ten aanzien van de einddatum: de einddatum wordt standaard ingevuld met een datum over exact één jaar. Bij de ontwikkeling hebben we ook gesproken over een standaard einddatum over 10 jaar of zelfs 100 jaar. Ik meen dat we met de Gebruikersgroep toen zijn uitgekomen op 1 jaar, omdat er in 1 jaar al veel kan gebeuren, en dus berichten na die tijd eigenlijk altijd herzien zouden moeten worden.
Er staat een getal naast 'Nieuws en werkinstructies' om aan te geven hoeveel 'belangrijke' nieuwsberichten er al open staan. We zouden hier graag zien dat het totaal aantal dat je nog open hebt zichtbaar is. Daarnaast refresht dit getal niet als je iets op gelezen zet. Dan moet je eerst KISS in zijn geheel refreshen, maar dan kun je ook contactmomenten verliezen.
Het getal refresht wel als je een Belangrijk Bericht als gelezen zet. Deze wordt elke 30 seconden gerefreshed, en als de focus opnieuw op Nieuws en Werkinstructies komt. 

Zaken
Functioneel: Wanneer er veel lopende zaken zijn duurt het laden heel lang. Als je dan opnieuw probeert komen ze soms wel heel snel in beeld, maar soms moet die ook ineens weer lang laden. De laadtijd lijkt heel wisselend te zijn. Kan dit opgelost worden?
Technisch: Ik zie dat per zaak een redelijke set calls wordt gedaan vanuit de frontend. de ZGW-api’s kennende snap ik dat. Mijn vragen:
Zou er gecached moeten worden in KISS?
Wordt er /kan er gebruik worden gemaakt van de expand-functionaliteit om het aantal calls te verlagen?
Dit (caching) zou mogelijk moeten zijn, maar zou nader onderzocht moeten worden. Aanvullend inzicht: OpenZaak is bezig om zg. convenience endpoints te maken, waarbij je bv. maar één call uitstuurt, en de achterliggende ‘calls’ in OpenZaak zelf worden afgehandeld. Complicerende factor hierin is dat KISS niet specifiek voor OpenZaak kunnen ontwikkelen.

Styling
De skills zijn nogal prominent aanwezig in het nieuwsoverzicht. Kunnen we hier qua styling iets aan doen?
Algemeen: Is er invloed op de styling uit te oefenen (NLDS-support?)
Er komt een nieuw design aan van de Nieuws en Werkinstructies, daarin is NLDS ook doorgevoerd (zij het vrij minimaal). Als er hier een grotere behoefte is zal dat ontwikkeld moeten worden (ontwikkelwens). 

Hopelijk kan je met deze input vooruit! 

Vriendelijke groeten / Kind regards,


Hoite Polkamp | Business Development Director
Marineterrein (building 027E)
Kattenburgerstraat 5 | 1018 JA Amsterdam
hoite@info.nl | www.info.nl


Titel: linkedin - Beschrijving: linkedin icon   Titel: Facebook  - Beschrijving: Facebook icon   Titel: instagram - Beschrijving: instagram icon
From: DevOps Nijmegen <devops@nijmegen.nl>
Date: Tuesday, 16 June 2026 at 15:57
To: Rutger (ICATT) <rutger@icatt.nl>
Cc: Hoite Polkamp - INFO <hoite@info.nl>
Subject: Testomgeving KISS Nijmegen, feedback en vragen

Beste Rutger, Hoite,

In Nijmegen zijn we een testomgeving van KISS (+ITA) aan het neerzetten zodat de afdeling burgerzaken/het KCC de functionaliteit kan testen. Daar is als het goed is al contact over geweest met jullie, o.a. via mijn collega Cristaan van Wijk. We hebben wat bevindingen waar we zelf nog niet helemaal van weten of / wat mogelijk is.

Het is best een lijst, ik verwacht zeker geen diepgaande antwoorden op elk specifiek punt! Maar mocht je ons op weg kunnen helpen, heel graag!

Er is o.a. één bug in open object die mogelijk nog niet in beeld was, het meeste zijn functionele vragen / feature requests die we zelf niet weten te beantwoorden. Hier zit van alles tussen, sommige dingen zien er uit als configuratiefouten aan onze kant, sommige zijn misschien bugs, andere gewoon feature requests. Als er punten zijn waar we met een simpel antwoord geholpen zijn hoor ik het graag!

Technisch algemeen:
Ter info: Bij het aanpassen van VAC’s gekoppeld aan open object versie 4.0.x gaat het mis, omdat de call de UUID bevat in de body, wat een bug in open object 4.0.x is. Dit wordt verholpen in https://github.com/maykinmedia/open-object/issues/765 


Wat betreft contactmomenten:
'Telefoonnummer 1' verplicht veld maken (er staat geen * bij) <- Aanname: E-mail óf telefoon is verplicht, dat zal de reden zijn?
'Interne toelichting voor medewerker' niet verplicht maken <- Aanname: deze is noodzakelijk voor het bericht aan medewerker?
Kan de optie 'Telefoon' in het veld 'Kanaal' bovenaan komen bij het maken van een contactmoment? Kunnen wij de volgorde veranderen hiervan, nu is het alfabetisch.
Kunnen de termen onder 'Afhandeling' aangepast worden? Nu staat er contactverzoek maken en genegeerd.
In Tribe kunnen wij nu aangeven in welke 'fase' een contactverzoek zit. Bijvoorbeeld 'terugbelnotitie naar backoffice', 'doorverbonden', 'afgehandeld', 'afgehandeld maar klant belt terug'. Kunnen we dit ook toevoegen in KISS? Of zit dit in de samenwerking met ITA?
Wanneer je een contactverzoek wil afhandelen en je hebt dingen in je 'notities' gezet, dan komt deze tijdens het afhandelen zowel bij 'Notitie' onder het kopje 'Details' te staan, als bij een contactverzoek onder 'Interne toelichting voor medewerker'. Als ik dan nog iets moet aanpassen, moet ik dit dubbel doen. Kunnen we dit voorkomen?
Kunnen we de term 'afronden' aanpassen in het scherm als je een contactverzoek maakt?
Als je zowel in de KVK hebt gezocht als in de BRP dan komen zowel bedrijf als inwoner bij 'afhandeling' onder 'klanten' te staan. Je moet er dan 1 selecteren, maar dan vult die niet automatisch de goede gegevens van degene die je selecteert.
Specifiek voor ondernemers:

Wanneer je een contactverzoek maakt voor een bedrijf (dus in het afhandel gedeelte zit), en je hebt deze gekoppeld aan de KVK gegevens, dan zie je alleen de naam van het bedrijf nog staan. De KVK/NAW gegevens zijn verdwenen. Dit is wel fijn om in beeld te hebben als laatste check voordat je een contactverzoek verzend.

Wat betreft nieuwsberichten:
Publicatiedatum leeglaten kan niet. Soms zetten wij wel iets klaar zonder dat er al een specifieke publicatiedatum bekend is, dan willen we dit nog leeg kunnen laten
Einddatum is verplicht. Maar niet elke instructie heeft een einddatum, kunnen we dit leeglaten?
Er staat een getal naast 'Nieuws en werkinstructies' om aan te geven hoeveel 'belangrijke' nieuwsberichten er al open staan. We zouden hier graag zien dat het totaal aantal dat je nog open hebt zichtbaar is. Daarnaast refresht dit getal niet als je iets op gelezen zet. Dan moet je eerst KISS in zijn geheel refreshen, maar dan kun je ook contactmomenten verliezen.

Wat betreft zaken:
Functioneel: Wanneer er veel lopende zaken zijn duurt het laden heel lang. Als je dan opnieuw probeert komen ze soms wel heel snel in beeld, maar soms moet die ook ineens weer lang laden. De laadtijd lijkt heel wisselend te zijn. Kan dit opgelost worden?
      Technisch: Ik zie dat per zaak een redelijke set calls wordt gedaan vanuit de frontend. de ZGW-api’s kennende snap ik dat. Mijn vragen:
Zou er gecached moeten worden in KISS?
Wordt er /kan er gebruik worden gemaakt van de expand-functionaliteit om het aantal calls te verlagen?

Mbt styling:
De skills zijn nogal prominent aanwezig in het nieuwsoverzicht. Kunnen we hier qua styling iets aan doen?
Algemeen: Is er invloed op de styling uit te oefenen (NLDS-support?)

Alvast hartelijk dank,

Joost van der Borg
Gemeente Nijmegen
```


## Tekst uit verschillende tickets



## Overicht van nieuw te maken tickets
Deze eitckets kunnen in 3 catagorien vallen:
- Vraag aan ICATT al beantwoord
- Vraag aan ICATT openstaand
- Ontwikkelwens voor ICATT


### Contact met ICATT over versie compatibiliteit support componenten
Hoe willen jullie (ICATT) omgaan met elastic en enterprise search. 
Omdat enterprise search EOL is in 9.x.


## Punten voor DevOps
1. Wanneer er veel lopende zaken zijn duurt het laden heel lang. Als je dan opnieuw probeert komen ze soms wel heel snel in beeld, maar soms moet die ook ineens weer lang laden. De laadtijd lijkt heel wisselend te zijn. Kan dit opgelost worden?
2. Kun je als beheerder bestaande contactmomenten opzoeken/aanpassen, zonder dit een nieuw contactmoment te maken? Of zit dit in ITA?
  - Dit zit in ITA (afgerond)
3. Op dit moment kunnen we alleen zoeken op telefoonnummer of e-mail, kan dit uitgebreid worden naar bijvoorbeeld afdeling, datum of medewerker? Of zit dit in ITA?
  - Dit zit deels in KISS (telefoon nummer en email)
  - Afdeling, datum medewerker zit in ITA (voor beheerders), voor medewerkers slechts van eigen afdeling & groep & eigen werkvoorraad


## Punten voor ICATT

### KISS
1. Als zaken zijn geladen dan zie je alleen in welk programma de zaak is aangemaakt, maar niet waar de zaak over gaat. Je ziet dus pas als je de zaak opent dat het bijvoorbeeld over een subsidie aanvraag gaat. Hierdoor kun je niet snel de goede zaak vinden tijdens een telefoongesprek. Kan dit opgelost worden?
2. Je ziet niet bij alle zaken een (indien)datum staan, kan dit toegevoegd worden?
3. Wat betekent status 'verzonden' of 'start status'? Onduidelijke termen, maar voor ons niet duidelijk of dit uit het zaaksysteem zelf komt.
4. Worden aangemaakte contactmomenten genummerd, zodat je hierop kan zoeken? Dit hebben we nu in Tribe wel --> we zien dat de contactmomenten nu genummerd zijn maar deze nummers zie je niet terug in het contactmomenten overzicht.
5. Is het mogelijk om informatie van contactverzoeken te exporteren? Die optie zien wij nu niet
6. Wat is het verschil tussen contactmomenten en contactverzoeken in een klantkaart (bijv. bij Boeddhoe)? De ene heeft meer info dan de ander, maar je krijgt zo 2 overzichten.

7. 'Telefoonnummer 1' verplicht veld maken (er staat geen * bij)
  - Email óf telefoon is verplicht, dat verklaard de *.
8. 'Interne toelichting voor medewerker' niet verplicht maken
  - Dit kan zo te zien niet, is dit niet de minimale info voor een terugbelverzoek?
9. Kan de optie 'Telefoon' in het veld 'Kanaal' bovenaan komen bij het maken van een contactmoment? Kunnen wij de volgorde veranderen hiervan, nu is het alfabetisch.
10. Kunnen de termen onder 'Afhandeling' aangepast worden? Nu staat er contactverzoek maken en genegeerd.
11. In Tribe kunnen wij nu aangeven in welke 'fase' een contactverzoek zit. Bijvoorbeeld 'terugbelnotitie naar backoffice', 'doorverbonden', 'afgehandeld', 'afgehandeld maar klant belt terug'. Kunnen we dit ook toevoegen in KISS? Of zit dit in de samenwerking met ITA?
12. Wanneer je een contactverzoek wil afhandelen en je hebt dingen in je 'notities' gezet, dan komt deze tijdens het afhandelen zowel bij 'Notitie' onder het kopje 'Details' te staan, als bij een contactverzoek onder 'Interne toelichting voor medewerker'. Als ik dan nog iets moet aanpassen, moet ik dit dubbel doen. Kunnen we dit voorkomen?
13. Kunnen we de term 'afronden' aanpassen in het scherm als je een contactverzoek maakt?
14. Als je zowel in de KVK hebt gezocht als in de BRP dan komen zowel bedrijf als inwoner bij 'afhandeling' onder 'klanten' te staan. Je moet er dan 1 selecteren, maar dan vult die niet automatisch de goede gegevens van degene die je selecteert.
15. Wanneer je een contactverzoek maakt voor een bedrijf (dus in het afhandel gedeelte zit), en je hebt deze gekoppeld aan de KVK gegevens, dan zie je alleen de naam van het bedrijf nog staan. De KVK/NAW gegevens zijn verdwenen. Dit is wel fijn om in beeld te hebben als laatste check voordat je een contactverzoek verzend.

Nieuwsberichten en werkinstructies
16. Publicatiedatum leeglaten kan niet. Soms zetten wij wel iets klaar zonder dat er al een specifieke publicatiedatum bekend is, dan willen we dit nog leeg kunnen laten
17. Einddatum is verplicht. Maar niet elke instructie heeft een einddatum, kunnen we dit leeglaten?
18. Er staat een getal naast 'Nieuws en werkinstructies' om aan te geven hoeveel 'belangrijke' nieuwsberichten er al open staan. We zouden hier graag zien dat het totaal aantal dat je nog open hebt zichtbaar is. Daarnaast refresht dit getal niet als je iets op gelezen zet. Dan moet je eerst KISS in zijn geheel refreshen, maar dan kun je ook contactmomenten verliezen.

### ITA
1. In ITA hebben we een overzicht van alle contactverzoeken, hier ontbreekt een zoekbalk (in deze zoekbalk wil je op nummer, naam, afdeling, etc. kunnen zoeken en filteren)
2. In alle contactverzoeken overzicht zie je geen afgeronde/verwerkte contactverzoeken
3. Als je een contactmoment die op groep/afdeling is aangemaakt afhandelt vanuit de algemene voorraad is deze niet zichtbaar in je eigen historie, dit staat dan alleen tussen afdelingshistorie. Het moment moet je dus eerst aan jezelf toewijzen of het moet aan je toegewezen worden.
4. Op het moment dat je een aangemaakt contactverzoek wil doorzetten in ITA naar een medewerker, kun je die optie niet selecteren. In het veld eronder kun je alleen een emailadres opgeven. Wanneer je dit emailadres invult komt het wel in 'mijn werkvoorraad' te staan. Het zou makkelijker zijn als we ook hier gewoon de optie krijgen om medewerkers te selecteren zoals het bij het aanmaken van contactverzoek zou moeten werken
5. Algemeent: filteren en zoeken in ITA
6. Kopje 'notitie' komt niet overeen met het kopje 'informatie voor burger / bedrijf. Het is duidelijker als we van het kopje 'Notitie' bij het aanmaken van een contactverzoek meteen 'Informatie voor burger/bedrijf' zien.
7. Reminders bij niet afhandelen contactverzoek door medewerker
8. Oplossing voor Out of Office verzinnen (no-reply zodat bounces ergens landen).



