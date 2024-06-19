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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetadataRenderer = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const art_engine_1 = require("@hashlips-lab/art-engine");
class MetadataRenderer {
    attributesGetter;
    name;
    description;
    tempRenderDir;
    constructor(constructorProps = {}) {
        this.name = constructorProps.name ? constructorProps.name : "";
        this.description = constructorProps.description
            ? constructorProps.description
            : "";
    }
    async init(props) {
        this.attributesGetter = props.attributesGetter;
        this.tempRenderDir = path.join(props.cachePath, art_engine_1.CACHE.RENDERERS_TEMP_CACHE_DIR);
    }
    ;
    getAttributes = (assets) => {
        const tempData = [];
        // assets.forEach(asset => {
        //   return tempData.push({
        //     trait_type: asset.layername,
        //     value: asset.value
        //   })
        // })
        for (var asset of assets) {
            tempData.push({
                trait_type: asset.layername,
                value: asset.value
            });
        }
        return tempData;
    };
    async render() {
        const renders = {};
        if (!fs.existsSync(this.tempRenderDir)) {
            fs.mkdirSync(this.tempRenderDir);
        }
        for (const [id, assets] of Object.entries(this.attributesGetter())) {
            const foundImage = assets.find((asset) => asset.kind == "ImageGenerator@v1");
            if (foundImage) {
                let metadata = {
                    name: this.name + " #" + (+id + 1),
                    description: this.description,
                    image: path.join(this.tempRenderDir, `${+id + 1}.png`),
                    date: Date.now(),
                    attributes: this.getAttributes(foundImage.data.assets)
                };
                const outputPath = path.join(this.tempRenderDir, `${+id + 1}.json`);
                fs.writeFileSync(outputPath, JSON.stringify(metadata, null, 2));
                renders[id] = [
                    {
                        kind: "MetadataRenderer@v1",
                        data: {
                            // name: metadata.name,
                            // description: metadata.description,
                            // image: metadata.image,
                            // date: metadata.date.toString(),
                            // attributes: metadata.attributes
                            path: outputPath
                        }
                    }
                ];
            }
        }
        return renders;
    }
}
exports.MetadataRenderer = MetadataRenderer;
