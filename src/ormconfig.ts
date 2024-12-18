import * as path from 'path';
import * as dotenv from 'dotenv';

const configPath = path.resolve(
  __dirname,
  `../config/${process.env.NODE_ENV || ''}.env`,
);
const loadConfigResult = dotenv.config({
  path: configPath,
});

if (loadConfigResult.error) {
  // eslint-disable-next-line no-console
  console.log('Load process.env error', {
    path: configPath,
    error: loadConfigResult.error,
  });
  throw loadConfigResult.error;
}

import { DataSource, DataSourceOptions } from 'typeorm';
import { getEntities } from './entities/entities';

const ormConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.TYPEORM_DATABASE_HOST,
  port: Number(process.env.TYPEORM_DATABASE_PORT),
  username: process.env.TYPEORM_DATABASE_USER,
  password: process.env.TYPEORM_DATABASE_PASSWORD,
  database: process.env.TYPEORM_DATABASE_NAME,
  // ssl: process.env.TYPEORM_DISABLE_SSL === 'true' ? false : undefined, // use default in case it's not set
  entities: getEntities(),
  migrations: ['migration/*.ts'],
  synchronize: process.env.NODE_ENV !== 'production', // Enable sync for test environments
  // cli: {
  //   migrationsDir: 'migration',
  // },
};

export const AppDataSource = new DataSource(ormConfig);

exports = ormConfig;
