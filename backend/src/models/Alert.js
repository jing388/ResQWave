const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema ({
    name: "Alert",
    tableName: "alerts",
    columns: {
        id: {
            type: "varchar",
            primary: true,
        },
        terminalID: {
            type: "varchar",
            length: 255,
            nullable: false,
        },
        alertType: {
            type: "varchar",
            length: 50,
            nullable: true, // Allow null when rescue is completed
            comment: "Valid values: Critical, User-Initiated"
        },
        sentThrough: {
            type: "varchar",
            length: 255,
            nullable: false,
        },
        dateTimeSent: {
            type: "timestamp",
            createDate: true,
            update: false
        },
        updatedAt: {
            type: "timestamp",
            updateDate: true,
        },
        status: {
            type: "varchar",
            length: 50,
            default: "Unassigned",
            nullable: false,
            comment: "Valid values: Waitlist, Unassigned, Dispatched"
        },
    },

    relations: {
        terminal: {
            type: "many-to-one",
            target: "Terminal",
            joinColumn: {
                name: "terminalID"
            },
            inverseSide: "alerts"
        },
    },

});