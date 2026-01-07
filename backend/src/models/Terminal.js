const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema ({
    name: "Terminal",
    tableName: "terminals",
    columns: {
        id: {
            type: "varchar",
            primary: true,
        },
        devEUI: {
            type: "varchar",
            length: 16,
            unique: true,
            nullable: true,
        },
        name: {
            type: "varchar",
            length: 255,
            nullable: false
        },
        dateCreated: {
            type: "timestamp",
            createDate: true,
            update: false
        },
        dateUpdated: {
            type: "timestamp",
            updateDate: true,
        },
        status: {
            type: "enum",
            enum: ["Online", "Offline"],
            default: "Offline",
        },
        archived: {
            type: "boolean",
            default: false,
        },
        availability: {
            type: "enum",
            enum: ["Available", "Occupied"],
            default: "Available",
        }
    },

    relations: {
        alerts: {
            type: "one-to-many",
            target: "Alert",
            inverseSide: "terminal",
        },
    },
});