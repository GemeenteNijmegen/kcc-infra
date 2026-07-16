import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { Cluster } from 'aws-cdk-lib/aws-ecs';
import { ElasticSyncConfiguration } from '../src/ConfigurationInterfaces';
import { ElasticSyncScheduledTasks } from '../src/services/ElasticSyncScheduledTasks';

function synth(config: ElasticSyncConfiguration): Template {
  const app = new App();
  const stack = new Stack(app, 'TestStack', { env: { account: '123456789012', region: 'eu-central-1' } });
  const cluster = new Cluster(stack, 'Cluster', { vpc: new Vpc(stack, 'Vpc') });
  new ElasticSyncScheduledTasks(stack, 'elastic-sync', { cluster, config });
  return Template.fromStack(stack);
}

const baseConfig: ElasticSyncConfiguration = {
  environment: {},
  sources: [
    { id: 'vac', args: ['vac'], schedule: 'rate(59 minutes)' },
    { id: 'smoelenboek', args: ['smoelenboek'], schedule: 'rate(59 minutes)' },
  ],
};

describe('ElasticSyncScheduledTasks', () => {
  test('uses the new EventBridge Scheduler, not legacy Events rules', () => {
    const template = synth(baseConfig);
    template.resourceCountIs('AWS::Scheduler::Schedule', 2);
    template.resourceCountIs('AWS::Events::Rule', 0);
  });

  test('creates a Fargate ECS target per source', () => {
    const template = synth(baseConfig);
    template.hasResourceProperties('AWS::Scheduler::Schedule', {
      ScheduleExpression: 'rate(59 minutes)',
      Target: {
        EcsParameters: { LaunchType: 'FARGATE', TaskCount: 1 },
      },
    });
  });

  describe('parseSchedule', () => {
    test('passes a rate() expression through unchanged', () => {
      const template = synth({ ...baseConfig, sources: [{ id: 'a', schedule: 'rate(1 hour)' }] });
      template.hasResourceProperties('AWS::Scheduler::Schedule', { ScheduleExpression: 'rate(1 hour)' });
    });

    test('passes a cron() expression through unchanged', () => {
      const template = synth({ ...baseConfig, sources: [{ id: 'a', schedule: 'cron(0 3 * * ? *)' }] });
      template.hasResourceProperties('AWS::Scheduler::Schedule', { ScheduleExpression: 'cron(0 3 * * ? *)' });
    });

    test('wraps a bare duration in rate()', () => {
      const template = synth({ ...baseConfig, sources: [{ id: 'a', schedule: '5 minutes' }] });
      template.hasResourceProperties('AWS::Scheduler::Schedule', { ScheduleExpression: 'rate(5 minutes)' });
    });
  });
});
