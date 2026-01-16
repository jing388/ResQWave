const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "FocalPersonRegistration",
  tableName: "focalpersonregistration", // match actual table name
  columns: {
    id: {
      type: "varchar",
      length: 40,
      primary: true,
    },
    status: {
      type: "varchar",
      length: 16,
      default: "Pending"
    },
    phoneNumber: {
      type: "varchar",
      length: 15,
      nullable: true
    },
    email: {
      type: "varchar",
      length: 255,
      nullable: true
    },
    firstName: {
      type: "varchar",
      length: 80
    },
    lastName: {
      type: "varchar",
      length: 80
    },
    dateOfBirth: {
      type: "date",
      nullable: true
    },
    age: {
      type: "int",
      nullable: true
    },
    photo: {
      type: "bytea",
      nullable: true
    },
    password: {
      type: "varchar",
      length: 255
    },
    location: {
      type: "text",
      nullable: false
    },

    // Alternative Focal Person
    altFirstName: {
      type: "varchar",
      length: 80,
      nullable: false
    },
    altLastName: {
      type: "varchar",
      length: 80,
      nullable: false
    },
    altPhoneNumber: {
      type: "varchar",
      length: 40,
      nullable: false,
    },
    altPhoto: {
      type: "bytea",
      nullable: true
    },


    // Approval Metadata
    approvedAt: {
      type: "timestamp",
      nullable: true
    },
    approvedBy: {
      type: "varchar",
      length: 40,
      nullable: true
    },
    focalPersonID: {
      type: "varchar",
      length: 40,
      nullable: true
    },
    communityGroupID: {
      type: "varchar",
      length: 40,
      nullable: true
    },
    terminalID: {
      type: "varchar",
      length: 40,
      nullable: true
    },

    // Neighbordhood 
    noOfHouseholds: {
      type: "int",
      nullable: true
    },
    noOfResidents: {
      type: "int",
      nullable: true
    },
    floodSubsideHours: {
      type: "int",
      nullable: true
    },
    hazardsJson: {
      type: "text",
      nullable: true
    },
    otherInformation: {
      type: "text",
      nullable: true,
    },

    createdAt: {
      type: "timestamp",
      createDate: true,
      update: false
    },
    updatedAt: {
      type: "timestamp",
      createDate: true,
      update: true
    }
  },
});