const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
    name: "Log",
    tableName: "logs",
    columns: {
        id: {
            type: "bigint",
            primary: true,
            generated: "increment"
        },
        entityType: {
            type: "varchar",
            length: 50,
            nullable: false,
        },
        entityID: {
            type: "varchar",
            length: 64,
            nullable: false,
        },
        field: {
            type: "varchar",
            length: 100,
            nullable: false
        },
        oldValue: {
            type: "text",
            nullable: true
        },
        newValue: {
            type: "text",
            nullable: true
        },
        actorID: {
            type: "varchar",
            length: 64,
            nullable: true
        },
        actorRole: {
            type: "varchar",
            length: 50,
            nullable: true
        },
        createdAt: {
            type: "timestamptz",
            nullable: false
        }
    },
    indices: [
        {name: "idxLogsEntityCreatedAt", columns: ["entityType", "entityID", "createdAt"]},
        {name: "idxLogsCreatedAt", columns: ["createdAt"]},
        {name: "idxLogsActorCreatedAt", columns: ["actorID", "createdAt"]},
    ],
});