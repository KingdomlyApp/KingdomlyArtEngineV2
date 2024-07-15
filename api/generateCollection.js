const { ArtEngine } = require("@hashlips-lab/art-engine");

const { LayersInput } = require("../dist/inputs/input");
const { ImageGenerator } = require("../dist/generators/generator");
const {
  MetadataRenderer,
} = require("../dist/renderers/metadataRenderer/metadataRenderer");
const {
  ImageRenderer,
} = require("../dist/renderers/imageRenderer/imageRenderer");
const { ImageExporter } = require("../dist/exporters/imageExporter");

const request = require("request");
const fs = require("fs");
const basePath = process.cwd();
const path = require("path");
const FirebaseDB = require("../dist/utils/lib/FirebaseDB").default;

async function GenerateCollection(req, res) {
  if (
    req.body.projectName != null &&
    req.body.projectId != null &&
    req.body.description != null &&
    req.body.dir != null &&
    req.body.dnaList != null
  ) {
    res.status(200).send({
      message: "Started Art Generation!",
    });

    const { projectName, projectId, description } = req.body;

    const dir = new Map(Object.entries(req.body.dir));
    const dnaList = new Map(Object.entries(req.body.dnaList));

    if (!dir || !dnaList || !projectName) {
      return res.status(400).send({ error: "check entered fields." });
    }

    // Update Firebase to isGenerating = true
    const firebase = new FirebaseDB();
    await firebase.updateIsGenerating(projectId);

    //Step 1: Create unique folder from the given project id
    const projectPath = path.join(basePath, `tmp/${projectId}`);
    const directoryPath = path.join(projectPath, `/layers/`);
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }

    //Step2: Download the layers from the request body to the local layers folder
    const downloadPromises = [];
    for (const [key, dirs] of dir) {
      for (const currDir of Array.from(dirs)) {
        const dirPath = path.join(directoryPath, `${currDir.collection_name}`);
        if (fs.existsSync(dirPath)) {
          fs.rmdirSync(dirPath, { recursive: true });
        }
        fs.mkdirSync(dirPath, { recursive: true });

        for (const layer of Array.from(currDir.layers)) {
          const layerPath = path.join(dirPath, `${layer.name}`);
          if (fs.existsSync(layerPath)) {
            fs.rmdirSync(layerPath, { recursive: true });
          }
          fs.mkdirSync(layerPath, { recursive: true });

          for (const trait of Array.from(layer.traits)) {
            const filePath = path.join(layerPath, `${trait.name}.png`);
            const file = fs.createWriteStream(filePath);

            downloadPromises.push(
              new Promise((resolve, reject) => {
                request
                  .get(trait.img_link)
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
              })
            );
          }
        }
      }
    }
    await Promise.all(downloadPromises);

    //Step 3: Art Engine
    const artEngine = new ArtEngine({
      cachePath: `${projectPath}/cache`,
      outputPath: `${projectPath}/output`,
      projectName: projectName,
      useCache: false,

      inputs: {
        layers: new LayersInput(`${directoryPath}`, dir),
      },

      generators: [new ImageGenerator("layers", dir, dnaList)],

      renderers: [
        new MetadataRenderer({
          name: projectName,
          description: description,
        }),

        new ImageRenderer({}),
      ],

      exporters: [new ImageExporter(projectName)],
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
        reject();
        return;
      }
    });

    await fileProcessingPromise;

    // Step 5: Upload the metadata to Firebase

    // Step 6: Return the CID and delete tmp/projectId folder
    const cid_data = fs.readFileSync(`${projectPath}/output/cid.json`);
    const { img_cid, metadata_cid } = JSON.parse(cid_data);

    await firebase.updateDoneGenerating(projectId, img_cid, metadata_cid);

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
  } else {
    return res.status(400).send({
      message: "Generation failed! Missing inputs!",
    });
  }
}

module.exports = GenerateCollection;
