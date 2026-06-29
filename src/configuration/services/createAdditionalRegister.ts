import { AppParameter } from '../../constructs/AppParameter';
import { Statics } from '../../Statics';

export interface AdditionalRegisterOptions {
  /**
   * KISS only talks to a single Open-Klant instance, so every register
   * (including additional ones) reuses the same `KLANTINTERACTIE_*`
   * `AppParameter`s — pass in the same instances used for register 0
   * rather than creating new ones.
   * If empty, it will creates its own new AppParameters
   */
  readonly klantinteractieBaseUrl?: AppParameter;
  readonly klantinteractieToken?: AppParameter;
  /**
   * @default 'OpenKlant2'
   */
  readonly registryVersion?: string;
  /**
   * Human-readable name for this register (e.g. the zaaksysteem it points
   * to), included in the description of the SSM params/secrets created for
   * it so they're identifiable in the AWS console.
   */
  readonly name: string;
}

/**
 * Creates the `REGISTERS__<index>__*` environment entries for an additional
 * KISS register (on top of the always-present `REGISTERS__0__*` register).
 *
 * KISS supports connecting multiple open-klant/open-zaak registers at once
 * (see https://kiss-klantinteractie-servicesysteem.readthedocs.io/nl/v2.1.0/decision-record/meerdere-registers.html).
 * Register `0` is configured directly in each environment's configuration file;
 * use this helper to add register `1`, `2`, etc.
 *
 * The `ZAAKSYSTEEM_*` `AppParameter`s created here get an `id` and SSM `path`
 * suffixed with `index`, so:
 * - the construct ids stay unique across the whole config (CDK requires this,
 *   see `ParameterStage.createAppParameters`, which creates one resource per
 *   unique `AppParameter.id`);
 * - each additional register gets its own SSM parameters/secrets for its
 *   zaaksysteem, instead of silently reusing register 0's values.
 *
 * Additional registers are never the default register; `IS_DEFAULT` is
 * hardcoded to `'false'` and is not configurable.
 */
export function createAdditionalRegister(
  index: number,
  options: AdditionalRegisterOptions,
): Record<string, string | AppParameter> {
  if (index === 0) {
    throw Error('Register 0 is the default register and is configured directly, not via createAdditionalRegister');
  }

  const prefix = `REGISTERS__${index}__`;
  const ssmBase = `/${Statics.projectName}/kiss/registers/${index}`;

  return {
    [`${prefix}IS_DEFAULT`]: 'false',
    [`${prefix}KLANTINTERACTIE_BASE_URL`]: options.klantinteractieBaseUrl ?? new AppParameter({
      type: 'ssm',
      id: `kiss-kcc-open-klant-url-${index}`,
      description: `KISS config: URL for Open-Klant (register ${index}: ${options.name})`,
      path: `${ssmBase}/open-klant/base-url`,
    }),

    [`${prefix}KLANTINTERACTIE_TOKEN`]: options.klantinteractieToken ?? new AppParameter({
      type: 'secret',
      id: `kiss-kcc-open-klant-api-token-${index}`,
      description: `KISS config: API token for Open-Klant (register ${index}: ${options.name})`,
      path: `${ssmBase}/open-klant/api-token`,
    }),
    [`${prefix}REGISTRY_VERSION`]: options.registryVersion ?? 'OpenKlant2',
    [`${prefix}ZAAKSYSTEEM_ZAKEN_BASE_URL`]: new AppParameter({
      type: 'ssm',
      id: `kiss-kcc-open-zaak-zaken-url-${index}`,
      description: `KISS config: URL for Open-Zaak Zaken (register ${index}: ${options.name})`,
      path: `${ssmBase}/open-zaak/zaken-url`,
    }),
    [`${prefix}ZAAKSYSTEEM_CATALOGI_BASE_URL`]: new AppParameter({
      type: 'ssm',
      id: `kiss-kcc-open-zaak-catalogi-url-${index}`,
      description: `KISS config: URL for Open-Zaak catalogi (register ${index}: ${options.name})`,
      path: `${ssmBase}/open-zaak/catalogi-url`,
    }),
    [`${prefix}ZAAKSYSTEEM_DOCUMENTEN_BASE_URL`]: new AppParameter({
      type: 'ssm',
      id: `kiss-kcc-open-zaak-documenten-url-${index}`,
      description: `KISS config: URL for Open-Zaak documenten (register ${index}: ${options.name})`,
      path: `${ssmBase}/open-zaak/documenten-url`,
    }),
    [`${prefix}ZAAKSYSTEEM_API_CLIENT_ID`]: new AppParameter({
      type: 'ssm',
      id: `kiss-kcc-open-zaak-client-id-${index}`,
      description: `KISS config: Open-Zaak client id (register ${index}: ${options.name})`,
      path: `${ssmBase}/open-zaak/client-id`,
    }),
    [`${prefix}ZAAKSYSTEEM_API_KEY`]: new AppParameter({
      type: 'secret',
      id: `kiss-kcc-open-zaak-clientsecret-${index}`,
      description: `KISS config: Open-Zaak client secret (register ${index}: ${options.name})`,
      path: `${ssmBase}/open-zaak/clientsecret`,
    }),
  };
}
