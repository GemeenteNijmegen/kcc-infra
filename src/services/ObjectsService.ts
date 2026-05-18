import { Construct } from 'constructs/lib/construct';
import { ObjectsServiceConfiguration } from '../ConfigurationInterfaces';
import { IContainerService } from '../constructs/ContainerPlatform';

export interface ObjectsServiceProps {
  readonly serviceConfiguration: ObjectsServiceConfiguration;
}

export class ObjectsService extends Construct implements IContainerService {
  id: string;
  bind(): void {
    throw new Error('Method not implemented.');
  }
}