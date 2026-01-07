const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema ({
    name: "Admin",
    tableName: "admins",
    columns: {
        id: {
            type: "varchar",
            primary: true,
            generated: false,
        },
        name: {
            type: "varchar",
            length: 255,
            nullable: false,
        },
        email: {
            type: "varchar",
            length: 255,
            nullable: false,
            unique: true,
        },
        contactNumber: {
            type: "varchar",
            length: 13,
            nullable: true,
        },
        failedAttempts: {
            type: "int",
            default: 0
        },
        lockUntil: {
            type: "datetime",
            nullable: true
        },
        password: {
            type: "varchar",
            length: 255,
            nullable: false,
        },
        passwordLastUpdated: {
            type: "timestamp",
            nullable: true
        },
        createdAt: {
            type: "timestamp",
            createDate: true,
            update: false
        }
    },
});