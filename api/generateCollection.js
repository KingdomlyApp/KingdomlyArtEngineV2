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

const firebase = new FirebaseDB();
const { SharpImageProcessor } = require("../dist/utils/processors/sharp");
const imageProcessor = new SharpImageProcessor();

async function GenerateCollection(req, res) {
  if (
    req.body.projectName != null &&
    req.body.projectId != null &&
    req.body.description != null &&
    Object.entries(req.body.dnaList).length !== 0
  ) {
    // if (!dir || !dnaList || !projectName) {
    //   return res.status(400).send({ error: "check entered fields." });
    // }

    if (!req.body.dnaList || !req.body.projectName) {
      await firebase.updateErrorGenerating(
        projectId,
        "Dna List or Project Name is undefined. Check entered fields!"
      );
      return res.status(400).send({ error: "check entered fields." });
    } else {
      res.status(200).send({
        message: "Started Art Generation!",
      });
    }

    const { projectName, projectId, description } = req.body;

    const dnaList = new Map(Object.entries(req.body.dnaList));

    // Update Firebase to isGenerating = true
    await firebase.updateIsGenerating(projectId);

    //Step 1: Create unique folder from the given project id
    const projectPath = path.join(basePath, `tmp/${projectId}`);
    const directoryPath = path.join(projectPath, `/layers/`);
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }

    //Step2: Download the layers from the request body to the local layers folder
    let dir = [];
    const downloadPromises = [];

    if (req.body.dir) {
      dir = new Map(Object.entries(req.body.dir));

      for (const [key, dirs] of dir) {
        const dirPath = path.join(
          directoryPath,
          `temp/${dirs.collection_name}`
        );
        if (fs.existsSync(dirPath)) {
          fs.rmdirSync(dirPath, { recursive: true });
        }
        fs.mkdirSync(dirPath, { recursive: true });

        for (const layer of Array.from(dirs.layers)) {
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
    } else {
      dir = new Map();
    }

    let uniqueOneOfOnes = [];

    for (const [key, dnas] of dnaList) {
      if (
        key === "one_of_ones_0" ||
        key === "one_of_ones_1" ||
        key === "one_of_ones_2" ||
        key === "one_of_ones"
      ) {
        const dirPath = path.join(directoryPath, "/one_of_ones");
        if (fs.existsSync(dirPath)) {
          fs.rmdirSync(dirPath, { recursive: true });
        }
        fs.mkdirSync(dirPath, { recursive: true });
        for (const ooos of Array.from(dnas)) {
          // Check if oneofones is downloaded already
          if (!uniqueOneOfOnes.includes(ooos.ooos.layers[0].trait_name)) {
            uniqueOneOfOnes.push(ooos.ooos.layers[0].trait_name);
            const filePath = path.join(
              dirPath,
              `${ooos.ooos.layers[0].trait_name}.png`
            );
            const file = fs.createWriteStream(filePath);

            downloadPromises.push(
              new Promise((resolve, reject) => {
                request
                  .get(ooos.ooos.url)
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

    //Step2.1 Resize the images
    const imageProcessor = new SharpImageProcessor();
    for (const [key, dirs] of dir) {
      const dirPath = path.join(directoryPath, `temp/${dirs.collection_name}`);
      const outputPath = path.join(directoryPath, `${dirs.collection_name}`);

      for (const layer of dirs.layers) {
        const layerPath = path.join(dirPath, `${layer.name}`);
        const outputLayerPath = path.join(outputPath, `${layer.name}`);
        if (fs.existsSync(outputLayerPath)) {
          fs.rmdirSync(outputLayerPath, { recursive: true });
        }
        fs.mkdirSync(outputLayerPath, { recursive: true });
        await imageProcessor.checkImageSize(
          `${layerPath}`,
          outputLayerPath,
          1024,
          1024
        );
      }
    }

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
          ooosPath: `${projectPath}/layers/one_of_ones`,
        }),

        new ImageRenderer({ projectId: projectId, firebaseDB: firebase }),
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

    // Step 5: Return the CID and delete tmp/projectId folder
    const cid_data = fs.readFileSync(`${projectPath}/output/cid.json`);
    const { img_cid, metadata_cid } = JSON.parse(cid_data);

    await firebase.updateDoneGenerating(projectId, img_cid, metadata_cid);
  } else {
    await firebase.updateErrorGenerating(
      req.body.projectId,
      "Dna List or Project Name is undefined. Check entered fields!"
    );
    console.log(
      req.body.projectId,
      ": Dna List or Project Name is undefined. Check entered fields!"
    );
    return res.status(400).send({
      message: "Generation failed! Missing inputs!",
    });
  }

  if (fs.existsSync(path.join(basePath, `tmp/${req.body.projectId}`))) {
    fs.rmSync(
      path.join(basePath, `tmp/${req.body.projectId}`),
      { recursive: true, force: true },
      (err) => {
        if (err) {
          throw err;
        }

        console.log(
          `${req.body.projectId} folder has been generated successfully and now being deleted!`
        );
      }
    );
  }
}

module.exports = GenerateCollection;
