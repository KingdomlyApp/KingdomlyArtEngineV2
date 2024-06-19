const _Router = require("express").Router;
const GenerateCollection = require("./api/generateCollection");

const Router = _Router();

Router.get("/", async (req, res) => {
  res.send({ status: true, message: "artGen2V1" });
});

Router.get("/status", async (req, res) => {
  console.log("Health check");
  res.status(200).send({ message: "OK" });
});

Router.post("/", GenerateCollection);

module.exports = Router;
