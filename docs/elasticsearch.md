# Elasticsearch & Enterprise Search

Tijdelijke test-setup van Elasticsearch 8.17.0 met Enterprise Search op een EC2 instance.

## Wat wordt automatisch geregeld

Na een succesvolle pipeline deploy:

| Component | Details |
|-----------|---------|
| Elasticsearch 8.17.0 | Draait op poort 9200, single-node, security enabled |
| Enterprise Search 8.17.0 | Draait op poort 3002, verbonden met lokale Elasticsearch |
| Trial license (Enterprise) | Automatisch geactiveerd, 30 dagen geldig |
| Wachtwoord (`elastic` user) | Gegenereerd in Secrets Manager, automatisch geconfigureerd |
| SSM endpoint parameters | Automatisch gevuld met private IP |
| KISS koppeling | `ELASTIC_BASE_URL`, `ELASTIC_PASSWORD`, `ENTERPRISE_SEARCH_BASE_URL` automatisch geïnjecteerd |

## Handmatige stappen na eerste deploy

### 1. Verifieer dat Enterprise Search draait

```bash
# SSM Session Manager naar de instance
aws ssm start-session --target <instance-id> --region eu-central-1

# Check Enterprise Search
curl http://localhost:3002
```

### 2. Haal API credentials op

```bash
ES_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id "/kcc-infra/kiss/elastic/password" \
  --region eu-central-1 \
  --query SecretString --output text)

# Bekijk beschikbare credentials
curl -u "elastic:$ES_PASSWORD" http://localhost:3002/api/as/v1/credentials
```

### 3. Vul de API keys in Secrets Manager

Na het aanmaken van de `kiss-engine` (meta engine) in Enterprise Search.

Haal eerst de keys op (op de instance via SSM Session Manager):

```bash
ES_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id "/kcc-infra/kiss/elastic/password" \
  --region eu-central-1 \
  --query SecretString --output text)

curl -u "elastic:$ES_PASSWORD" http://localhost:3002/api/as/v1/credentials
```

Vul de keys vervolgens **vanaf je lokale machine** (de instance role heeft geen schrijfrechten op deze secrets):

```bash
aws secretsmanager put-secret-value \
  --secret-id "/kcc-infra/kiss/elastic/enterprise-search-public-api-key" \
  --secret-string "<search-key>" \
  --region eu-central-1 --output json

aws secretsmanager put-secret-value \
  --secret-id "/kcc-infra/kiss/elastic/enterprise-search-private-api-key" \
  --secret-string "<private-key>" \
  --region eu-central-1 --output json
```

### 4. Herstart KISS

Zodat de containers de nieuwe secrets oppikken:

```bash
aws ecs update-service --cluster <cluster-name> \
  --service <kiss-service-name> \
  --force-new-deployment \
  --region eu-central-1 --output json
```

## Trial license

- Geldig voor 30 dagen na eerste boot
- Kan niet gereset worden op dezelfde instance
- Na expiry: destroy en redeploy de stack voor een nieuwe trial
- Voor structureel gebruik: neem contact op met Elastic voor een subscription

## Instance beheer

```bash
# Verbinden via SSM Session Manager
aws ssm start-session --target <instance-id> --region eu-central-1

# Elasticsearch status
systemctl status elasticsearch

# Enterprise Search status
systemctl status enterprise-search

# Logs bekijken
journalctl -u elasticsearch -f
journalctl -u enterprise-search -f

# Cluster health
ES_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id "/kcc-infra/kiss/elastic/password" \
  --region eu-central-1 --query SecretString --output text)
curl -u "elastic:$ES_PASSWORD" http://localhost:9200/_cluster/health?pretty
curl -u "elastic:$ES_PASSWORD" http://localhost:9200/_license?pretty
```

## Opruimen

Verwijder de `elasticsearch` key uit `src/configuration/developmentConfiguration.ts` en deploy opnieuw. De EC2 instance, security group, secrets, en SSM parameters worden automatisch verwijderd.

## Architectuur

```
┌─────────────────────────────────────────────┐
│ EC2 Instance (t3.medium, PRIVATE_ISOLATED)  │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ Elasticsearch 8.17.0 (:9200)        │    │
│  │ - single-node, xpack.security=true  │    │
│  │ - trial license (enterprise)        │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ Enterprise Search 8.17.0 (:3002)    │    │
│  │ - App Search (engines, crawlers)    │    │
│  │ - verbindt met ES op localhost:9200 │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
         │ :9200              │ :3002
         ▼                    ▼
┌─────────────────────────────────────────────┐
│ KISS (ECS/Fargate)                          │
│ - ELASTIC_BASE_URL = http://<ip>:9200       │
│ - ENTERPRISE_SEARCH_BASE_URL = http://<ip>:3002
│ - ELASTIC_PASSWORD = uit Secrets Manager    │
└─────────────────────────────────────────────┘
         ▲ :9200              ▲ :3002
         │                    │
┌─────────────────────────────────────────────┐
│ ElasticSync (ECS/Fargate Scheduled Tasks)   │
│ - Elke 59 min via EventBridge               │
│ - Synct bronnen naar Elasticsearch indices  │
└─────────────────────────────────────────────┘
```

## ElasticSync — Scheduled indexering

De [KISS Elastic Sync](https://github.com/Klantinteractie-Servicesysteem/KISS-Elastic-Sync) container synchroniseert data uit de Objects API naar Elasticsearch indices. In Kubernetes zou dit met CronJobs gaan; hier gebruiken we **ECS Scheduled Tasks via EventBridge**.

### Hoe het werkt

- Per bron (VAC, smoelenboek) draait een apart Fargate task op een schedule; momenteel 2 tasks
- De tasks starten, voeren de sync uit, en stoppen weer; er draait niets permanent (0 containers buiten de sync-momenten)
- Kosten: alleen betalen voor de seconden/minuten dat de container draait (0.25 vCPU, 512MB per task)
- EventBridge triggert elke 59 minuten een `RunTask` op het ECS cluster (overgenomen uit de [KISS Kubernetes CronJob voorbeelden](https://github.com/Klantinteractie-Servicesysteem/KISS-Elastic-Sync/tree/main/deploy))
- De container krijgt dezelfde Elastic credentials als KISS (endpoint, wachtwoord, Enterprise Search URL)

### Geconfigureerde bronnen

| Bron | Container argument | Schedule | Objecttype UUID |
|------|-------------------|----------|-----------------|
| VAC | `vac` | Elke 59 min | `c8dda48e-6ab3-4e16-9631-815435f7f3fa` |
| Smoelenboek (medewerkers) | `smoelenboek` | Elke 59 min | `797a7a50-049d-491b-bb0a-fce1ba95a35c` |

SDG/Kennisbank is voorbereid in de code maar nog niet actief (geen objecttype aangemaakt).

### Environment variabelen

De sync container heeft de volgende variabelen nodig:

| Variabele | Bron | Automatisch? |
|-----------|------|-------------|
| `ELASTIC_BASE_URL` | SSM parameter (uit Elasticsearch construct) | Ja |
| `ELASTIC_USERNAME` | Hardcoded `elastic` | Ja |
| `ELASTIC_PASSWORD` | Secrets Manager | Ja (gedeeld met KISS) |
| `ENTERPRISE_SEARCH_BASE_URL` | SSM parameter | Ja |
| `ENTERPRISE_SEARCH_ENGINE` | Hardcoded `kiss-engine` | Ja |
| `ENTERPRISE_SEARCH_PRIVATE_API_KEY` | Secrets Manager | Ja (gedeeld met KISS) |
| `VAC_OBJECTEN_BASE_URL` | SSM met default | Ja |
| `VAC_OBJECT_TYPE_URL` | SSM met default | Ja |
| `VAC_OBJECTEN_TOKEN` | Secrets Manager | Gedeeld met KISS, moet gevuld zijn |
| `MEDEWERKER_OBJECTEN_BASE_URL` | SSM met default | Ja |
| `MEDEWERKER_OBJECT_TYPE_URL` | SSM met default | Ja |
| `MEDEWERKER_OBJECTEN_TOKEN` | Secrets Manager | Gedeeld met groepen token |

### Construct

Zie `src/constructs/ElasticSyncScheduledTasks.ts`. Configuratie staat in `elasticSync` in de environment configuration.

### Bron toevoegen

1. Voeg environment variabelen toe aan `elasticSync.environment` in de configuratie
2. Voeg een entry toe aan `elasticSync.sources` met het juiste container argument
3. Deploy

### Debugging

```bash
# Bekijk logs van de sync tasks
aws logs tail /aws/ecs/kcc-infra-elastic-sync --follow --region eu-central-1

# Handmatig een sync triggeren (voorbeeld voor VAC)
aws ecs run-task \
  --cluster <cluster-name> \
  --task-definition <vac-task-def> \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[<subnet-id>],securityGroups=[<sg-id>]}" \
  --region eu-central-1
```
