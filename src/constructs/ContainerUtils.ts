import { AwsLogDriver, ContainerDefinition, ContainerDependencyCondition, ContainerImage, TaskDefinition } from 'aws-cdk-lib/aws-ecs';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { LogGroup } from 'aws-cdk-lib/aws-logs';


export class ContainerServiceUtils {

  /**
   * Allows ECS Exec commands in containers, note this should be enabled on service level as well.
   * @param task the task to allow exec to
   */
  static allowExecutingCommands(task: TaskDefinition) {
    task.addToTaskRolePolicy(new PolicyStatement({
      actions: [
        'ssmmessages:CreateControlChannel',
        'ssmmessages:CreateDataChannel',
        'ssmmessages:OpenControlChannel',
        'ssmmessages:OpenDataChannel',
      ],
      effect: Effect.ALLOW,
      resources: ['*'],
    }));
  }

  /**
   * Add ephemeral storage to a container
   * @param container
   * @param name
   * @param mountpoints
   */
  static attachEphemeralStorage(container: ContainerDefinition, name: string, ...mountpoints: string[]) {
    mountpoints.forEach(mountpoint => {
      container.addMountPoints({
        containerPath: mountpoint,
        readOnly: false,
        sourceVolume: name,
      });
    });
  }


  /**
   * Initalize the writable directories the task requires
   * @param volumeName
   * @param task
   * @param runBeforeContainer
   * @param dirs
   */
  static setupWritableVolume(volumeName: string, task: TaskDefinition, logs: LogGroup, runBeforeContainer: ContainerDefinition, ...dirs: string[]) {
    const command = dirs.map(dir => `chmod 0777 ${dir}`).join(' && ');
    const fsInitContainer = task.addContainer('init-storage', {
      image: ContainerImage.fromRegistry('alpine:latest'),
      entryPoint: ['sh', '-c'],
      command: [command],
      readonlyRootFilesystem: true,
      essential: false, // exit after running
      logging: new AwsLogDriver({
        streamPrefix: 'logs',
        logGroup: logs,
      }),
    });
    runBeforeContainer.addContainerDependencies({
      container: fsInitContainer,
      condition: ContainerDependencyCondition.SUCCESS,
    });
    dirs.forEach(dir => {
      ContainerServiceUtils.attachEphemeralStorage(fsInitContainer, volumeName, dir);
    });
    return fsInitContainer;
  }


}