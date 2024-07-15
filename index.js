require("dotenv").config();
const express = require("express");
const json = express.json;
const path = require("path");
const Router = require("./routes");

const app = express();

app.use(json({ limit: "50mb" }));

const PORT = process.env.PORT || 3001;
app.use("/", Router);

const server = app.listen(PORT, () =>
  console.log(`App is now listening for requests at port ${PORT}`)
);

server.setTimeout(3600000);
