//imports
const express = require("express");
const cloudinary = require("cloudinary").v2;
const xlsx = require("xlsx");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const Records = require("./models/model.js");

//configurations
dotenv.config();
const PORT = process.env.PORT;
const MONGODB_URI = process.env.mongodbURI;
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.set("view engine", "ejs");
app.set("views", "views");

mongoose //mongoose connection
    .connect(MONGODB_URI, { useUnifiedTopology: true, useNewUrlParser: true })
    .then(() => {
        app.listen(PORT, () => {
            console.log(`listening on port ${PORT}`);
        });
    })
    .catch((err) => console.error(err.message));

var storage = multer.diskStorage({
    // multer storage config
    destination: function (req, file, cb) {
        cb(null, path.join(process.cwd(), "uploads"));
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + "-" + Date.now());
    },
});

var upload = multer({ storage: storage });

cloudinary.config({
    //cloudinary config
    cloud_name: process.env.cloud_name,
    api_key: process.env.api_key,
    api_secret: process.env.api_secret,
});

var namesArray = [];
var imageArray = [];

app.post(
    "/upload",
    upload.fields([
        { name: "excel", maxCount: 1 },
        { name: "image", maxCount: 1 },
    ]),
    async (req, res, next) => {
        try {
            const excelFile = req.files.excel[0];
            const imageFile = req.files.image[0];
            const workBook = xlsx.readFile(
                path.join(process.cwd(), "uploads", excelFile.filename)
            );
            const data = workBook.Sheets.Sheet1; //extracting data from excel
            jsonData = xlsx.utils.sheet_to_json(data);
            jsonData.forEach((d) => {
                namesArray.push(d.name);
            });
            namesArray.forEach(async (name) => {
                cloudinary.uploader.upload(
                    //uploading image to cloudinary with watermark
                    imageFile.path,
                    {
                        transformation: [
                            { width: 400, crop: "scale" },
                            {
                                overlay: {
                                    font_family: "helvetica",
                                    font_size: 80,
                                    font_weight: "bold",
                                    text: `${name}`,
                                },
                                gravity: "south",
                                y: 20,
                                color: "#fff",
                                opacity: 100,
                            },
                        ],
                    },
                    (err, result) => {
                        if (err) {
                            return res.json({ status: "Upload failed!" });
                            console.log(err);
                        } else {
                            imageArray.push(result.secure_url);
                        }
                    }
                );
            });
            setTimeout(() => {
                const newRecord = new Records({
                    excel: excelFile.path,
                    image: imageFile.path,
                    result: imageArray,
                });
                newRecord
                    .save()
                    .then((result) => {
                        console.log(result);
                        res.render("images", { images: result.result });
                    })
                    .catch((err) => {
                        throw new Error(err);
                    });
            }, 6000);
        } catch (err) {
            console.log(err);
            return res.json({ status: "Upload failed!" });
        }
    }
);

app.get("/", (req, res, next) => {
    res.render("home");
});
