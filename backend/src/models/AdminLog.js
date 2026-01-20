const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
    name: "AdminLog",
    tableName: "adminlogs",
    columns: {
        id: {
            type: "bigint",
            primary: true,
            generated: "increment"
        },
        action: {
            type: "varchar",
            length: 50,
            nullable: false,
            comment: "Valid values: create, edit, archive, unarchive, delete"
        },
        entityType: {
            type: "varchar",
            length: 50,
            nullable: false,
            comment: "Valid values: Dispatcher, FocalPerson, Neighborhood, Terminal"
        },
        entityID: {
            type: "varchar",
            length: 64,
            nullable: false,
        },
        entityName: {
            type: "varchar",
            length: 255,
            nullable: true,
        },
        field: {
            type: "varchar",
            length: 100,
            nullable: true
        },
        oldValue: {
            type: "text",
            nullable: true
        },
        newValue: {
            type: "text",
            nullable: true
        },
        dispatcherID: {
            type: "varchar",
            length: 64,
            nullable: false
        },
        dispatcherName: {
            type: "varchar",
            length: 255,
            nullable: true
        },
        createdAt: {
            type: "timestamp",
            createDate: true,
            update: false
        }
    },
    indices: [
        {
            name: "idx_dispatcher",
            columns: ["dispatcherID"]
        },
        {
            name: "idx_entity",
            columns: ["entityType", "entityID"]
        },
        {
            name: "idx_action",
            columns: ["action"]
        },
        {
            name: "idx_created",
            columns: ["createdAt"]
        }
    ]
});
