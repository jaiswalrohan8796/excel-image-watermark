const mongoose = require("mongoose");

const recordSchema = mongoose.Schema(
    {
        excel: String,
        image: String,
        result: [String],
    },
    {
        writeConcern: {
            w: "majority",
            j: true,
            wtimeout: 1000,
        },
    }
);

module.exports = mongoose.model("Records", recordSchema);
