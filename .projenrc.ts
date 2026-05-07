import { GemeenteNijmegenCdkApp } from '@gemeentenijmegen/projen-project-type';
const project = new GemeenteNijmegenCdkApp({
  cdkVersion: '2.1.0',
  defaultReleaseBranch: 'main',
  name: 'kcc-infra',
  projenrcTs: true,
  deps: [
    '@gemeentenijmegen/utils',
    '@gemeentenijmegen/projen-project-type',
    '@gemeentenijmegen/cross-region-parameters',
    'dotenv',
    '@types/aws-lambda',
    '@aws-sdk/client-ec2',
    'pg', // Postgres client 🐘
  ],
  jestOptions: {
    jestConfig: {
      setupFiles: ['dotenv/config'],
    },
  },
  tsconfig: {
    compilerOptions: {
      isolatedModules: true,
    },
  },
});
project.synth();