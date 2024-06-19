const _Router = require("express").Router;
const GenerateCollection = require("./api/generateCollection");

const Router = _Router();

Router.get("/", async (req, res) => {
  res.statys(200).send({ message: "artGen2V1" });
});

Router.post("/", GenerateCollection);

module.exports = Router;
