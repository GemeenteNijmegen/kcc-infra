# KISS Managementinformatie API — Datastructuur

## Doel

Dit document beschrijft welke data het KISS managementinformatie endpoint (`/api/contactmomentendetails`) retourneert, zodat de projectgroep kan beoordelen of dit voldoende is voor KCC-rapportages.

> **Bron:** [KISS Documentatie - Managementinformatie](https://klantinteractie-servicesysteem.readthedocs.io/en/v1.1.0/manual/managementinformatie.html)  
> **Broncode:** [ContactmomentDetailsRapportageOverzicht.cs](https://github.com/Klantinteractie-Servicesysteem/KISS-frontend/blob/main/Kiss.Bff/Intern/ContactmomentDetails/Features/ContactmomentDetailsRapportageOverzicht.cs)

## Endpoint

```
GET /api/contactmomentendetails?from={datum}&to={datum}&pageSize={n}&page={n}
```

### Authenticatie

JWT Bearer token, ondertekend met het gedeelde secret (`MANAGEMENTINFORMATIE_API_KEY` in KISS).

De JWT payload bevat enkel `iat` (issued at) en `exp` (expiration) velden. Geen gebruiker-specifieke claims nodig.

### Query parameters

| Parameter | Type | Verplicht | Standaard | Omschrijving |
|-----------|------|-----------|-----------|--------------|
| `from` | string | Ja | - | Startdatum (ISO 8601, bijv. `2024-10-01T00:00:00Z`) |
| `to` | string | Ja | - | Einddatum (ISO 8601, bijv. `2024-10-31T23:59:59Z`) |
| `pageSize` | int | Nee | 5000 | Max resultaten per pagina (max 5000) |
| `page` | int | Nee | 1 | Paginanummer |

## Response structuur

```json
{
  "count": 142,
  "next": "https://kiss.example.nl/api/contactmomentendetails?from=...&page=2",
  "previous": null,
  "results": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "startdatum": "2024-10-01T09:15:00+02:00",
      "einddatum": "2024-10-01T09:23:00+02:00",
      "gespreksresultaat": "Afgehandeld",
      "vraag": "Parkeren",
      "specifiekeVraag": "Parkeervergunning aanvragen",
      "emailadresKcm": "j.jansen@voorbeeld.nl",
      "verantwoordelijkeAfdeling": "Burgerzaken",
      "bronnen": [
        {
          "soort": "VAC",
          "titel": "Parkeervergunning aanvragen",
          "url": "https://www.nijmegen.nl/parkeervergunning"
        }
      ]
    }
  ]
}
```

## Veldomschrijvingen

| Veld | Type | Nullable | Betekenis |
|------|------|----------|-----------|
| `id` | string | Nee | Unieke ID van het contactmoment (gekoppeld aan Klantinteracties-contactmoment) |
| `startdatum` | DateTimeOffset | Nee | Tijdstip waarop het gesprek begon |
| `einddatum` | DateTimeOffset | Nee | Tijdstip waarop het gesprek eindigde |
| `gespreksresultaat` | string | Ja | Resultaat/afhandeling van het gesprek |
| `vraag` | string | Ja | Hoofdcategorie/onderwerp van de vraag |
| `specifiekeVraag` | string | Ja | Meer specifieke omschrijving van de vraag |
| `emailadresKcm` | string | Ja | E-mailadres van de ingelogde KCC-medewerker (automatisch ingevuld bij opslaan) |
| `verantwoordelijkeAfdeling` | string | Ja | Afdeling die het contactmoment afhandelt |
| `bronnen` | array | Nee (kan leeg zijn) | Bronnen die de medewerker heeft geraadpleegd |
| `bronnen[].soort` | string | Nee | Type bron (bijv. VAC, website, kennisbank) |
| `bronnen[].titel` | string | Nee | Titel van de geraadpleegde bron |
| `bronnen[].url` | string | Nee | URL naar de bron |

## Mogelijke rapportages op basis van deze data

### Direct beschikbaar

- **Werkvolume:** Aantal contactmomenten per dag/week/maand
- **Gespreksduur:** Gemiddelde/mediaan gespreksduur (`einddatum - startdatum`)
- **Medewerker-productiviteit:** Contactmomenten per medewerker (`emailadresKcm`)
- **Afdeling-verdeling:** Verdeling over afdelingen (`verantwoordelijkeAfdeling`)
- **Top-onderwerpen:** Meest voorkomende vragen (`vraag` + `specifiekeVraag`)
- **Gespreksresultaten:** Verdeling van uitkomsten (`gespreksresultaat`)
- **Brongebruik:** Meest geraadpleegde bronnen en brontypen
- **Piekuren/drukte-analyse:** Op basis van `startdatum`

### Ontbreekt in dit endpoint

| Gegeven | Mogelijke alternatieve bron |
|---------|----------------------------|
| Kanaal (telefoon, balie, e-mail, chat) | Klantinteracties API (Open Klant) |
| Klantgegevens (BSN, naam) | Niet beschikbaar (privacy) |
| Wachttijd / wachtrij-informatie | Telefonie-systeem |
| Terugbelverzoeken / follow-up status | Contactverzoeken in Open Klant |
| Koppeling met zaken | Klantinteracties API (Open Klant) |
| Klanttevredenheid | Extern systeem |

## Conclusie

Dit endpoint is geschikt voor **operationele KCC-rapportages**: werkvolume, medewerker-productiviteit, vraagcategorisering, gespreksduur, en brongebruik. Voor een KCC-supervisor geeft dit inzicht in "hoeveel werk doen we, waarover gaan de vragen, en wie handelt wat af."

Voor een vollediger beeld (kanaal-informatie, zaakkoppelingen) zou aanvullend de Open Klant / Klantinteracties API bevraagd moeten worden.

## Zelf testen met Bruno

In de `bruno/rapportages/` folder staat een kant-en-klare request om het endpoint te bevragen. Het JWT token wordt automatisch gegenereerd door een pre-request script.

### Stappen

1. Open het project in [Bruno](https://www.usebruno.com/)
2. Selecteer de **"kcs - development"** environment
3. Vul de secret variabele `managementinformatieApiKey` in met het gedeelde KISS secret (de waarde van `MANAGEMENTINFORMATIE_API_KEY` — op te halen uit AWS Secrets Manager op pad `/${projectName}/kiss/managementinformatie/api-key`, wordt automatisch gegenereerd bij deploy)
4. Open de request `rapportages > contactmomentendetails`
5. Pas eventueel de `from` en `to` datums aan naar het gewenste bereik
6. Klik **Send**

Het pre-request script genereert automatisch een JWT (HS256, 24 uur geldig) en stuurt dit mee als Bearer token. Je ziet direct de response met de contactmomentdetails.

## Vervolgstappen

1. **Validatie:** Projectgroep beoordeelt of bovenstaande velden voldoende zijn
2. **Testen:** Gebruik de Bruno-call in `bruno/rapportages/` om het endpoint live te bevragen
3. **Automatisering:** Na akkoord, scheduled export naar S3 inrichten voor het datawarehouse
