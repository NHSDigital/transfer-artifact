import process from 'node:process';

export const region: () => string = () => process.env.AWS_REGION ?? 'eu-west-2';

export const env: () => string = () => process.env.ENVIRONMENT ?? 'unknown';
