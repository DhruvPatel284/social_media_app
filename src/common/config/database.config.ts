import 'reflect-metadata';

export default () => ({
  database: {
    type: process.env.DB_CONNECTION as 'mysql2' | 'postgres' | 'sqlite',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    synchronize: false,
  },
});
// export default databaseConfig;
