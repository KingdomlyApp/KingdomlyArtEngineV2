"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nft_storage_1 = require("nft.storage");
const fs = __importStar(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const NFT_STORAGE_KEY = process.env.NFT_STORAGE_KEY;
let convertDataURIToBinary = (dataURI) => {
    var BASE64_MARKER = ";base64,";
    var base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
    var base64 = dataURI.substring(base64Index);
    var buffer = Buffer.from(base64, 'base64');
    return new Uint8Array(buffer);
};
const convertImageToBase64 = async (imageUrl) => {
    try {
        // const response = await fetch(imageUrl, { cache: "reload" });
        const imageBuffer = fs.readFileSync(imageUrl);
        const base64Image = imageBuffer.toString('base64');
        return base64Image;
    }
    catch (error) {
        console.error("Error converting image to base64:", error);
    }
};
async function storeImages(metadata) {
    const batchSize = 500; // Number of images to process in a single batch
    let batchStart = 0;
    let allImages = [];
    const binaryCache = {}; // Cache for storing already converted binary data
    while (batchStart < metadata.length) {
        // Get the current batch of metadata
        const currentBatch = metadata.slice(batchStart, batchStart + batchSize);
        batchStart += batchSize;
        // Process the current batch
        const currentImages = await Promise.all(currentBatch.map(async (metadatum) => {
            const uri = {
                img: metadatum.image,
                name: metadatum.name.split("#")[1],
            };
            let imageFile = new nft_storage_1.File([fs.readFileSync(uri.img)], `${uri.name}.png`, { type: "image/png" });
            return imageFile;
        }));
        // Accumulate the processed images from the current batch
        allImages.push(...currentImages);
    }
    // After all batches are processed, store all images at once
    const storage = new nft_storage_1.NFTStorage({ token: NFT_STORAGE_KEY });
    const cid = await storage.storeDirectory(allImages);
    return cid;
}
async function storeMetadataJSONs(metadata) {
    //Converts Objects to Blobs and stores it in as an array
    const jsonBlobs = metadata.map((metadatum, i) => {
        const jsonBlob = new nft_storage_1.File([JSON.stringify(metadatum)], `${metadatum.name.split("#")[1]}`, {
            type: "application/json",
        });
        return jsonBlob;
    });
    const storage = new nft_storage_1.NFTStorage({ token: NFT_STORAGE_KEY });
    const car = await nft_storage_1.NFTStorage.encodeDirectory(jsonBlobs);
    const cid = await storage.storeCar(car.car);
    return cid;
}
async function updateMetadataImages(cidString, metadata) {
    //For each metadata file, update the image property to the CID of the image file
    metadata.forEach((metadatum) => {
        metadatum.image = `ipfs://${cidString}/${metadatum.name.split("#")[1]}.png`;
    });
}
async function main(metadata) {
    let img_cid = "";
    img_cid = await storeImages(metadata);
    await updateMetadataImages(img_cid, metadata);
    const metadata_cid = await storeMetadataJSONs(metadata);
    return { img_cid: img_cid, metadata_cid: metadata_cid, metadataList: metadata };
}
exports.default = main;
