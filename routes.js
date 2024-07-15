const _Router = require("express").Router;
const GenerateCollection = require("./api/generateCollection");

const Router = _Router();

Router.get("/", async (req, res) => {
  res.status(200).send({ message: "artGen2V1" });
});

Router.get("/healthCheck", async (req, res) => {
  console.log("Health check");
  res.status(200).send({ status: "OK" });
});

Router.post("/", GenerateCollection);

module.exports = Router;
