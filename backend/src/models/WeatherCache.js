const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
    name: "WeatherCache",
    tableName: "weather_cache",
    columns: {
        id: {
            type: "int",
            primary: true,
            generated: true,
        },
        terminalID: {
            type: "varchar",
            length: 255,
            nullable: false,
            unique: true,
            comment: "Terminal ID this weather cache belongs to"
        },
        hourlyForecast: {
            type: "jsonb",
            nullable: false,
            comment: "48-hour forecast array with 3-hour intervals"
        },
        weeklyForecast: {
            type: "jsonb",
            nullable: false,
            comment: "5-day weekly forecast array"
        },
        fetchedAt: {
            type: "timestamp",
            nullable: false,
            default: () => "CURRENT_TIMESTAMP",
            comment: "When this weather data was fetched from OpenWeather API"
        },
        expiresAt: {
            type: "timestamp",
            nullable: false,
            comment: "When this cache entry expires (6 hours from fetchedAt)"
        },
        apiCallCount: {
            type: "int",
            default: 1,
            comment: "Number of times this cache has been refreshed (for monitoring)"
        },
        lastAccessedAt: {
            type: "timestamp",
            nullable: true,
            comment: "Last time this cache was read (for analytics)"
        }
    },
    relations: {
        terminal: {
            type: "many-to-one",
            target: "Terminal",
            joinColumn: {
                name: "terminalID",
                referencedColumnName: "id"
            },
            onDelete: "CASCADE"
        }
    },
    indices: [
        {
            name: "IDX_WEATHER_TERMINAL_ID",
            columns: ["terminalID"],
        },
        {
            name: "IDX_WEATHER_EXPIRES_AT",
            columns: ["expiresAt"],
        }
    ]
});
