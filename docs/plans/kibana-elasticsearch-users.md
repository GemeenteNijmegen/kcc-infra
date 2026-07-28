# Plan: Dedicated Elasticsearch users for Kibana

## Problem

`KibanaService` currently connects to Elasticsearch as the `elastic` superuser
(the same credential shared by KISS, ElasticSync and WebsiteCrawler). Kibana
refuses to start with this:

```
FATAL Error: [config validation of [elasticsearch].username]: value of "elastic" is forbidden.
This is a superuser account that cannot write to system indices that Kibana needs to function.
Use a service account token instead.
```

Kibana explicitly rejects the reserved `elastic` superuser as its own backend
identity. It needs an account restricted to the built-in `kibana_system`
privileges, which is the identity Kibana uses to manage its own indices
(`.kibana*`, task manager, etc.) behind the scenes.

That account is **not suitable for interactively logging into the Kibana
browser UI** — Elastic's own docs say the `kibana_system` user must not be
used to sign in via the browser. So this plan needs two accounts:

1. **`kibana_system`** — backend/system account, used only inside the
   `ELASTICSEARCH_USERNAME` / `ELASTICSEARCH_PASSWORD` env vars of the Kibana
   ECS task. Never used by a human.
2. **A UI login account** — a normal native-realm user that operators type
   into Kibana's login page in the browser, with enough privileges to
   actually be useful in Discover/Dev Tools/Index Management.

## Design

### 1. `kibana_system` (backend account)

`kibana_system` is a **built-in reserved user** — it already exists once
`xpack.security.enabled: true` (already the case, see
[`install.sh`](../../src/elasticsearch/install.sh)), it just needs its
password set. This mirrors exactly what the script already does for the
`elastic` bootstrap password, so it's a small, consistent addition rather
than a new mechanism.

Steps to add in [`src/services/Elasticsearch.ts`](../../src/services/Elasticsearch.ts) / `install.sh`:

1. CDK creates a new generated `Secret` next to `elasticPasswordSecret`, e.g.
   `/kcc-infra/kibana/system-user/password`, and grants the EC2 role read
   access (same pattern as `elasticPasswordSecret.grantRead(role)`).
2. Pass its secret name into `UserData` as a new env var
   (`KIBANA_SYSTEM_PASSWORD_SECRET_ID`), same way `SECRET_ID` is passed today.
3. In `install.sh`, right after the existing "wait for Elasticsearch" loop
   (once `elastic` auth is confirmed working), fetch the new secret and call:

   ```bash
   curl -sf -u "elastic:${ES_PASSWORD}" -X POST \
     "http://localhost:9200/_security/user/kibana_system/_password" \
     -H 'Content-Type: application/json' \
     -d "{\"password\":\"${KIBANA_SYSTEM_PASSWORD}\"}"
   ```

4. In `KibanaService.ts`, stop importing the `kiss/elastic/password` secret
   entirely. Replace:
   - `ELASTICSEARCH_USERNAME: 'elastic'` → `'kibana_system'`
   - `ELASTICSEARCH_PASSWORD` secret → the new `kibana/system-user/password`
     secret.

   Net effect: the Kibana task no longer holds the `elastic` superuser
   credential at all, which is a strict security improvement (smaller blast
   radius if the Kibana container is ever compromised).

### 2. UI login account

A second native-realm user, e.g. `kibana-ui-admin`, created the same way
(generated CDK `Secret` for its password, injected into `install.sh`, created
via the security API). Its **roles** are the actual decision to make here —
picking between:

| Option | Roles assigned | Pros | Cons |
| --- | --- | --- | --- |
| **A. Custom read role (recommended)** | `kibana_admin` (built-in, full Kibana feature access) + a new custom role e.g. `kcc_kibana_data_read` granting `read` + `view_index_metadata` on the relevant index patterns | Least privilege: this login can browse/query data and use all Kibana features, but can't delete indices, manage users, or change cluster settings. Meaningfully safer to expose behind a public login page. | One extra `_security/role` API call in `install.sh`; needs to pick/maintain an index pattern (`*` for simplicity, or scope to `search-*`, `.ds-*`, etc.) |
| **B. `kibana_admin` + `superuser`** | Full access to everything, same power as the `elastic` account used elsewhere in the project | Zero extra design work | Reintroduces a full-superuser credential behind a browser login — the exact category of risk we're removing from Kibana's backend connection in step 1 |

Recommendation: **Option A**, since the whole point of this change is to stop
handing out superuser credentials to yet another surface. Given this is
still a low-criticality dev environment, `read` + `view_index_metadata` on
`*` (rather than a narrower per-index pattern) is a reasonable minimal
choice — it avoids having to keep an index-pattern allowlist in sync with
whatever indices ElasticSync/WebsiteCrawler create over time.

Steps:

1. CDK creates `Secret` at `/kcc-infra/kibana/ui-admin/password` (generated,
   read-granted to the EC2 role — same as above).
2. `install.sh`, after setting `kibana_system`'s password, additionally:

   ```bash
   # Custom role: Kibana UI + read-only data access
   curl -sf -u "elastic:${ES_PASSWORD}" -X PUT \
     "http://localhost:9200/_security/role/kcc_kibana_data_read" \
     -H 'Content-Type: application/json' \
     -d '{"indices":[{"names":["*"],"privileges":["read","view_index_metadata"]}]}'

   # UI login user
   curl -sf -u "elastic:${ES_PASSWORD}" -X POST \
     "http://localhost:9200/_security/user/kibana-ui-admin" \
     -H 'Content-Type: application/json' \
     -d "{\"password\":\"${KIBANA_UI_ADMIN_PASSWORD}\",\"roles\":[\"kibana_admin\",\"kcc_kibana_data_read\"],\"full_name\":\"Kibana UI admin\"}"
   ```

3. This account is **not** wired into any ECS task/CDK secret consumption —
   it only needs to exist in Elasticsearch. Operators fetch the password to
   log into the Kibana UI with:

   ```bash
   aws secretsmanager get-secret-value \
     --secret-id /kcc-infra/kibana/ui-admin/password \
     --query SecretString --output text
   ```

   Worth adding a `CfnOutput` on the stack (or a line in `docs/`) pointing at
   this secret path so it isn't tribal knowledge.

## Idempotency / lifecycle note

`install.sh` already wipes `/var/lib/elasticsearch/*` and recreates the
keystore on every EC2 boot, meaning the native realm (and therefore any
users/roles created here) is rebuilt from scratch every time the instance is
(re)provisioned — exactly like the existing `elastic` bootstrap password.
The two new curl blocks fit into that same "runs fresh every boot" model, so
no extra idempotency handling (e.g. "does this role already exist") is
needed beyond what the script already assumes for `elastic`.

This also means: if the EC2 instance is ever replaced, **all Elasticsearch
data is lost**, not just users — that's a pre-existing risk unrelated to
this plan and out of scope here.

## Alternatives considered

- **Service account token (`elastic/kibana`)** — this is literally what
  Kibana's error message suggests, and is Elastic's more modern
  recommendation over the `kibana_system` password user (tokens can be
  individually revoked, aren't subject to password policies). Rejected for
  now because the token value is generated by Elasticsearch itself (you
  can't pre-set it from CDK), so it needs `install.sh` to call
  `POST _security/service/elastic/kibana/credential/token/<name>` and then
  `aws secretsmanager put-secret-value` the result back — meaning the EC2
  role needs `secretsmanager:PutSecretValue`, not just `GetSecretValue`, and
  the CDK-created secret becomes a mutable side channel rather than a value
  CDK fully owns. More moving parts for a low-criticality dev branch; the
  `kibana_system` password approach reuses the existing bootstrap-password
  idiom exactly. Worth revisiting if/when this needs to be production-grade.
- **Lambda-backed custom resource** calling the ES security API at deploy
  time (similar to `custom-resources/additional-database`) — rejected as
  over-engineering: it would need VPC networking into the ES private
  subnet, and ordering against the EC2 UserData completion, when `install.sh`
  already owns 100% of this bootstrapping today.

## Implementation checklist

- [ ] `Elasticsearch.ts`: create `kibanaSystemPasswordSecret` and
      `kibanaUiAdminPasswordSecret`, grant EC2 role read access, pass secret
      names into `UserData`.
- [ ] `install.sh`: after the existing "wait for Elasticsearch" loop, add the
      `kibana_system` password call, the `kcc_kibana_data_read` role, and the
      `kibana-ui-admin` user creation call.
- [ ] `KibanaService.ts`: drop the `kiss/elastic/password` secret import;
      import `kibana/system-user/password` instead; set
      `ELASTICSEARCH_USERNAME: 'kibana_system'`.
- [ ] Add a `CfnOutput` (or doc note) with the `ui-admin` secret path so
      operators know where to find their Kibana login.
- [ ] Re-run `npx projen build` (synth + tests + lint) to confirm the CDK
      diff is as expected, then deploy and verify: Kibana container starts
      cleanly, and `kibana-ui-admin` can log in via the browser.
