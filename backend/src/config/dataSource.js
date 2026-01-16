const { DataSource } = require("typeorm");
require("reflect-metadata");
require("dotenv").config();


const AppDataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || "5432"),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
        rejectUnauthorized: false // Required for Supabase
    },
    synchronize: false, // auto create/update for tables
    logging: true,
    entities: [
        __dirname + "/../models/*.js" // load all models in models
    ],
});

module.exports = { AppDataSource }