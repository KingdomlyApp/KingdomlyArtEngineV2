require("dotenv").config();
const express = require("express");
const json = express.json;
const path = require("path");
const cors = require("cors");
const Router = require("./routes");

const allowedOrigins = process.env.ALLOWED_ORIGINS.split(",");

const corsOptions = {
  origin: function (origin, callback) {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: "POST, GET",
  allowedHeaders: "*",
};

const app = express();

app.use(json({ limit: "50mb" }));

app.use("/", cors(corsOptions), (req, res, next) => {
  next();
});

const PORT = process.env.PORT || 3001;
app.use("/", Router);

const server = app.listen(PORT, () =>
  console.log(`App is now listening for requests at port ${PORT}`)
);

server.setTimeout(3600000);
