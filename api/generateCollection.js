const { ArtEngine } = require("@hashlips-lab/art-engine");

const { LayersInput } = require("../custom/inputs/input");
const { ImageGenerator } = require("../custom/generators/generator");
const {
  MetadataRenderer,
} = require("../custom/renderers/metadataRenderer/metadataRenderer");
const {
  ImageRenderer,
} = require("../custom/renderers/imageRenderer/imageRenderer");
const { ImageExporter } = require("../custom/exporters/image-exporter");

const request = require("request");
const fs = require("fs");
const basePath = process.cwd();
const path = require("path");
const FirebaseClass = require("../lib/FirebaseClass");

async function GenerateCollection(req, res) {
  const {
    editions, //Array of layers object. Each layer has its name, qty, and url to that image.
    projectId, //Separator of different projects for layers and build files
    name, //Name of the collection
    description, //Description of the collection
    layerConfigurations, //Array of layer configurations
  } = req.body;

  //Checks if the request body has all the required fields
  if (
    !editions ||
    !projectId ||
    !name ||
    !description ||
    !layerConfigurations
  ) {
    return res.status(400).send({ error: "check entered fields." });
  }

  const firebaseClass = new FirebaseClass();
  await firebaseClass?.updateIsGenerating(projectId, true);

  //Step 1: Create unique folder from the given project id
  const projectPath = path.join(basePath, `tmp/${projectId}`);
  const directoryPath = path.join(projectPath, `/layers/`);
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }

  //Step 2: Download the layers from the request body to the local layers folder
  await Promise.all(
    editions.map(async (edition) => {
      const editionPath = path.join(directoryPath, `${edition.name}`);
      if (fs.existsSync(editionPath)) {
        fs.rmdirSync(editionPath, { recursive: true });
      }
      fs.mkdirSync(editionPath, { recursive: true });

      await Promise.all(
        edition.layers.map(async (layer) => {
          const layerPath = path.join(editionPath, `${layer.name}`);
          if (fs.existsSync(layerPath)) {
            fs.rmdirSync(layerPath, { recursive: true });
          }
          fs.mkdirSync(layerPath, { recursive: true });

          await Promise.all(
            layer.attributes.map(async (attribute) => {
              const filePath = path.join(layerPath, `${attribute.name}`);
              const file = fs.createWriteStream(filePath);

              return new Promise((resolve, reject) => {
                request
                  .get(attribute.url)
                  .on("error", (err) => {
                    console.error(err);
                    reject(err);
                  })
                  .pipe(file)
                  .on("finish", () => {
                    file.close();
                    resolve();
                  })
                  .on("error", (err) => {
                    fs.unlinkSync(filePath); // Delete the file on error
                    console.error(err);
                    reject(err);
                  });
              });
            })
          );
        })
      );
    })
  );

  //Step 3: Art Engine
  const artEngine = new ArtEngine({
    cachePath: `${projectPath}/cache`,
    outputPath: `${projectPath}/output`,
    useCache: false,

    inputs: {
      layers: new LayersInput(`${directoryPath}`, layerConfigurations),
    },

    generators: [new ImageGenerator("layers", layerConfigurations)],

    renderers: [
      new MetadataRenderer({
        name: name,
        description: description,
      }),

      new ImageRenderer({}),
    ],

    exporters: [new ImageExporter()],
  });

  await artEngine.run();

  //Step 4: Update metadata jsons with the images in the folder
  let allMetadata = [];
  const directory = `${projectPath}/output/_metadata.json`;

  let fileProcessingPromise = new Promise((resolve, reject) => {
    if (fs.existsSync(directory)) {
      const data = fs.readFileSync(directory, "utf8");

      let jsonData = JSON.parse(data);

      for (let i in jsonData) {
        allMetadata.push(jsonData[i]);
      }

      resolve();
    } else {
      reject(err);
      return;
    }
  });

  await fileProcessingPromise;

  //Step 5: Upload the metadata to Firebase
  const { url, metadata } = await firebaseClass.updateMetadata(
    allMetadata,
    projectId
  );

  // Step 6: Return the CID and delete tmp/projectId folder
  const cid_data = fs.readFileSync(`${projectPath}/output/cid.json`);
  const { img_cid, metadata_cid } = JSON.parse(cid_data);

  if (fs.existsSync(projectPath)) {
    fs.rmSync(projectPath, { recursive: true, force: true }, (err) => {
      if (err) {
        throw err;
      }

      console.log(
        `${projectId} folder has been generated successfully and now being deleted!`
      );
    });
  }

  return res.status(200).send({
    message: "Success: Metadata Url: " + url,
    metadata_cid: metadata_cid,
    img_cid: img_cid,
  });
}

module.exports = GenerateCollection;
