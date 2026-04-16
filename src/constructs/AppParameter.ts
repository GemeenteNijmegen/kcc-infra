import { ISecret, Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { IStringParameter, StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export interface AppParameterProps {
  /**
   * Identifier of this parameter (used by CDK)
   */
  readonly id: string;
  /**
   * Either a SSM StringParameter or a Secrets Manager secret
   */
  readonly type: 'ssm' | 'secret';
  /**
   * The SSM parameter path
   */
  readonly path: string;
  /**
   * Description of the parameter
   */
  readonly description: string;
  /**
   * Default value for the parameter
   */
  readonly defaultValue?: string;
}

export class AppParameter {

  readonly id: string;
  readonly type: 'ssm' | 'secret';
  readonly path: string;

  constructor(readonly props: AppParameterProps) {
    this.id = props.id;
    this.type = props.type;
    this.path = props.path;
  }

  create(scope: Construct, id: string) {
    if (this.props.type === 'secret') {
      return new Secret(scope, id, {
        secretName: this.props.path,
        description: this.props.description,
      });
    }
    return new StringParameter(scope, id, {
      parameterName: this.props.path,
      stringValue: this.props.defaultValue ?? '-',
    });
  }

  /**
   * Returns the parameter as a IStringParameter (SSM) or as an ISecret (Secrets Manager).
   */
  import(scope: Construct, id: string): { asEnv?: IStringParameter; asSecret?: ISecret } {
    if (this.props.type === 'ssm') {
      return { asEnv: StringParameter.fromStringParameterName(scope, id, this.props.path) };
    }
    return { asSecret: Secret.fromSecretNameV2(scope, id, this.props.path) };
  }
}
