const { DataSource } = require("typeorm");
require("reflect-metadata");
require("dotenv").config();


const AppDataSource = new DataSource ({
    type: "mysql",
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    username: process.env.DB_USER ,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME ,
    synchronize: false, // auto create/update for tables
    logging: true,
    entities: [
        __dirname + "/../models/*.js" // load all models in models
    ],
});

module.exports = { AppDataSource }