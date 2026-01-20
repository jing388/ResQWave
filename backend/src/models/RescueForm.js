const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema ({
    name: "RescueForm",
    tableName: "rescueforms",
    columns: {
        id: {
            type: "varchar",
            primary: true,
        },
        emergencyID: {
            type: "varchar",
            length: 255,
            nullable: false
        },
        dispatcherID: {
            type: "varchar",
            length: 255,
            nullable: true, // Allow nulls so admins can create forms
        },
        focalPersonID: {
            type: "varchar",
            length: 255,
            nullable: true,
        },
        focalUnreachable: {
            type: "boolean",
            default: false
        },
        originalAlertType: {
            type: "varchar",
            length: 50,
            nullable: true,
            comment: "Preserves the original alert type before dispatch to display in reports page"
        },
        waterLevel: {
            type: "varchar",
            length: 255,
            nullable: true,
        },
        urgencyOfEvacuation: {
            type: "varchar",
            length: 255,
            nullable: true,
        },
        hazardPresent: {
            type: "varchar",
            length: 255,
            nullable: true,
        },
        accessibility: {
            type: "varchar",
            length: 255,
            nullable: true,
        },
        resourceNeeds: {
            type: "varchar",
            length: 255,
            nullable: true,
        },
        otherInformation: {
            type: "varchar",
            length: 255,
            nullable: true,
        },
        status: {
            type: "varchar",
            length: 50,
            default: "Waitlisted",
            comment: "Valid values: Waitlisted, Dispatched, Completed"
        }
    },

    relations: {
        alert: {
            type: "one-to-one",
            target: "Alert",
            joinColumn: {
                name: "emergencyID"
            },
            inverseSide: "rescueForms"
        },
        dispatcher: {
            type: "many-to-one",
            target: "Dispatcher",
            joinColumn: {
                name: "dispatcherID"
            },
            inverseSide: "rescueForms"
        },
        focalPerson: {
            type: "many-to-one",
            target: "FocalPerson",
            joinColumn: {
                name: "focalPersonID"
            },
            inverseSide: "rescueForms"
        }
    },
});