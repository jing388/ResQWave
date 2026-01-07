const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema ({
    name: "Alarm",
    tableName: "alarms",
    columns: {
        id: {
            type: "int",
            primary: true,
            generated: false,
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
            type: "enum",
            enum: ["Critical Battery Level", "Extended Downtime"]
        },
        status: {
            type: "enum",
            enum: ["Active", "Cleared"],
            nullable: false
        },
        severity: {
            type: "enum",
            enum: ["Major", "Minor"],
            nullable: false,
        },
        createdAt: {
            type: "timestamp",
            createDate: true,
            update: false
        },
        updatedAt: {
            type: "timestamp",
            updateDate: true,
        }
    },
});