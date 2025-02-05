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

const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { Readable } = require("stream");

// Configure AWS SDK v3
const s3Client = new S3Client({
  region: process.env.AWS_REGION, // e.g., 'us-west-2'
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Helper function to stream S3 data to a file
async function streamToFile(readableStream, filePath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);
    readableStream.pipe(file);
    file.on("finish", resolve);
    file.on("error", reject);
  });
}

async function GenerateCollection(req, res) {
  if (req.body.projectName != null && req.body.projectId != null) {
    let totalCount = 0;

    const { projectName, projectId } = req.body;

    // Use dnalist from request body if it exists, otherwise fetch from Firebase
    const dnaListFB =
      req.body.dnalist || (await firebase.getDnaList(projectId));

    Array.from(Object.entries(dnaListFB)).forEach((dnaList) => {
      totalCount += dnaList[1].length;
    });

    if (!dnaListFB || !req.body.projectName) {
      console.log(
        `${req.body.projectId} Dna List or Project Name is undefined. Check entered fields!`
      );
      await firebase.updateErrorGenerating(
        projectId,
        "Dna List or Project Name is undefined. Check entered fields!"
      );
      return res.status(400).send({ message: "check entered fields." });
    } else if (
      totalCount > 1000 &&
      !(await firebase.getPartnerCode(projectId))
    ) {
      // console.log(firebase.getPartnerCode(projectId));
      console.log(`${req.body.projectId} Collection size is too large`);
      await firebase.updateErrorGenerating(
        projectId,
        "Collection size is too large"
      );
      return res.status(400).send({ message: "Collection size is too large" });
    } else {
      res.status(200).send({
        message: "Started Art Generation!",
      });
    }

    console.log(`Generating ${projectId}`);

    const dnaList = new Map(Object.entries(dnaListFB));

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
        // const dirPath = path.join(
        //   directoryPath,
        //   `temp/${dirs.collection_name}`
        // );
        const dirPath = path.join(directoryPath, `${dirs.collection_name}`);
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
    let tempFileName = "";

    for (const [key, dnas] of dnaList) {
      if (
        key === "one_of_ones_0" ||
        key === "one_of_ones_1" ||
        key === "one_of_ones_2" ||
        key === "one_of_ones" ||
        key === "single_asset"
      ) {
        const dirPath = path.join(directoryPath, "/one_of_ones");
        if (fs.existsSync(dirPath)) {
          fs.rmdirSync(dirPath, { recursive: true });
        }
        fs.mkdirSync(dirPath, { recursive: true });
        for (const ooos of Array.from(dnas)) {
          if (ooos.ooos.url.includes("firebase")) {
            tempFileName = ooos.ooos.url.split("%2F")[4].split("?alt")[0];
            if (tempFileName.includes("%20")) {
              tempFileName = tempFileName.replaceAll("%20", " ");
            }
          } else {
            tempFileName = ooos.ooos.url.split("/").pop().split(".png")[0];
          }

          // Check if oneofones is downloaded already
          if (!uniqueOneOfOnes.includes(tempFileName)) {
            uniqueOneOfOnes.push(tempFileName);
            const filePath = path.join(dirPath, `${tempFileName}.png`);
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
      } else if (key === "metadata_assets") {
        const dirPath = path.join(directoryPath, "/one_of_ones");
        if (fs.existsSync(dirPath)) {
          fs.rmdirSync(dirPath, { recursive: true });
        }
        fs.mkdirSync(dirPath, { recursive: true });

        for (const asset of Array.from(dnas)) {
          const s3Params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: `metadata-assets/${projectId}/${asset.ooos.url.split("/")[5]}`, // Assuming `s3_key` is the key for the S3 object
          };

          const filePath = path.join(dirPath, `${asset.name}.png`);

          downloadPromises.push(
            new Promise(async (resolve, reject) => {
              try {
                const command = new GetObjectCommand(s3Params);
                const { Body } = await s3Client.send(command);
                await streamToFile(Body, filePath);
                resolve();
              } catch (err) {
                console.error(err);
                fs.unlinkSync(filePath); // Delete the file on error
                reject(err);
              }
            })
          );
        }
      }
    }

    await Promise.all(downloadPromises);

    // //Step2.1 Resize the images
    // const imageProcessor = new SharpImageProcessor();
    // for (const [key, dirs] of dir) {
    //   const dirPath = path.join(directoryPath, `temp/${dirs.collection_name}`);
    //   const outputPath = path.join(directoryPath, `${dirs.collection_name}`);

    //   for (const layer of dirs.layers) {
    //     const layerPath = path.join(dirPath, `${layer.name}`);
    //     const outputLayerPath = path.join(outputPath, `${layer.name}`);
    //     if (fs.existsSync(outputLayerPath)) {
    //       fs.rmdirSync(outputLayerPath, { recursive: true });
    //     }
    //     fs.mkdirSync(outputLayerPath, { recursive: true });
    //     await imageProcessor.checkImageSize(
    //       `${layerPath}`,
    //       outputLayerPath,
    //       1024,
    //       1024
    //     );
    //   }
    // }

    // const imageProcessor = new SharpImageProcessor();
    // const dirPath = path.join(directoryPath, "/temp/one_of_ones");
    // const outputPath = path.join(directoryPath, "/one_of_ones");
    // if (!fs.existsSync(outputPath)) {
    //   fs.mkdirSync(outputPath, { recursive: true });
    // }
    // await imageProcessor.checkImageSize(dirPath, outputPath, 1024, 1024);

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

      exporters: [
        new ImageExporter(
          projectName,
          req.body.isSingleAsset ? req.body.isSingleAsset : false
        ),
      ],
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
    fs.rmdirSync(
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
