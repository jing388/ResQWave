const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema ({
    name: "Alarm",
    tableName: "alarms",
    columns: {
        id: {
            type: "int",
            primary: true,
            generated: "increment",
        },
        terminalID: {
            type: "varchar",
            length: 255,
            nullable: true,
        },
        terminalName: {
            type: "varchar",
            length: 255,
            nullable: true,
        },
        name: {
            type: "varchar",
            length: 100,
            comment: "Valid values: Critical Battery Level, Extended Downtime"
        },
        status: {
            type: "varchar",
            length: 50,
            nullable: false,
            comment: "Valid values: Active, Cleared"
        },
        severity: {
            type: "varchar",
            length: 50,
            nullable: false,
            comment: "Valid values: Major, Minor"
        },
        createdAt: {
            type: "timestamp",
            createDate: true,
            update: false
        },
        updatedAt: {
            type: "timestamp",
            updateDate: true,
        },
        archived: {
            type: "boolean",
            default: false,
        }
    },
});