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
exports.ImageExporter = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const ipfs_upload_1 = __importDefault(require("../utils/lib/ipfs-upload"));
class ImageExporter {
    rendersGetter;
    outputPath;
    async init(props) {
        this.rendersGetter = props.rendersGetter;
        this.outputPath = props.outputPath;
    }
    async uploadMetadataToIPFS(metadata) {
        return new Promise(async (resolve, reject) => {
            try {
                const metadataCopy = JSON.parse(JSON.stringify(metadata.sort((a, b) => Number(a.name.split("#")[1]) - Number(b.name.split("#")[1]))));
                const { metadata_cid, img_cid, metadataList } = await (0, ipfs_upload_1.default)(metadataCopy);
                let baseURI = `ipfs://${metadata_cid}/`;
                fs.writeFileSync(path.join(this.outputPath, "_metadata.json"), JSON.stringify(metadataList, null, 2));
                resolve({
                    img_cid,
                    metadata_cid,
                    baseURI,
                });
            }
            catch (error) {
                reject(error);
            }
        });
    }
    async export() {
        if (!fs.existsSync(this.outputPath)) {
            fs.mkdirSync(this.outputPath);
        }
        let metadataList = [];
        for (const [_, renders] of Object.entries(this.rendersGetter())) {
            let jsonDataAndPath = renders.find((render) => "MetadataRenderer@v1" === render.kind);
            if (jsonDataAndPath) {
                const fileContent = fs.readFileSync(jsonDataAndPath.data.path, "utf8");
                metadataList.push(JSON.parse(fileContent));
            }
        }
        const { img_cid, metadata_cid, baseURI } = await this.uploadMetadataToIPFS(metadataList);
        const cid = {
            img_cid: img_cid,
            metadata_cid: metadata_cid,
        };
        fs.writeFileSync(path.join(this.outputPath, "cid.json"), JSON.stringify(cid));
    }
}
exports.ImageExporter = ImageExporter;
