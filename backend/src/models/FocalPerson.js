const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
    name: "FocalPerson",
    tableName: "focalpersons",
    columns: {
        id: {
            type: "varchar",
            length: 40,
            primary: true
        },
        firstName: {
            type: "varchar",
            length: 80,
            nullable: false
        },
        lastName: {
            type: "varchar",
            length: 80,
            nullable: false
        },
        email: {
            type: "varchar",
            length: 255,
            nullable: true
        },
        contactNumber: {
            type: "varchar",
            length: 40,
            nullable: true
        },
        password: {
            type: "varchar",
            length: 255,
            nullable: false
        },
        passwordLastUpdated: {
            type: "timestamp",
            nullable: true,
        },
        address: {
            type: "text",
            nullable: true
        },
        photo: {
            type: "bytea",
            nullable: true
        },
        alternativeFPImage: {
            type: "bytea",
            nullable: true
        },
        altFirstName: {
            type: "varchar",
            length: 255,
            nullable: true
        },
        altLastName: {
            type: "varchar",
            length: 255,
            nullable: true
        },
        altEmail: {
            type: "varchar",
            length: 255,
            nullable: true
        },
        altContactNumber: {
            type: "varchar",
            length: 40,
            nullable: true
        },
        approvedBy: {
            type: "varchar",
            length: 255,
            nullable: true
        },
        archived: {
            type: "boolean",
            default: false
        },
        failedAttempts: {
            type: "int",
            default: 0
        },
        lockUntil: {
            type: "timestamp",
            nullable: true,
        },
        newUser: {
            type: "boolean",
            default: true
        },
        createdAt: {
            type: "timestamp",
            createDate: true,
            update: false
        },
        updatedAt: {
            type: "timestamp",
            updateDate: true
        },
    },

    relations: {
        rescueForms: {
            type: "one-to-many",
            target: "RescueForm",
            inverseSide: "focalPerson"
        }
    }
});