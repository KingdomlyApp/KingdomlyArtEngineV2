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
exports.ImageRenderer = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const art_engine_1 = require("@hashlips-lab/art-engine");
const sharp_1 = require("../../utils/processors/sharp");
const sharp = require("sharp");
class ImageRenderer {
    attributesGetter;
    tempRenderDir;
    imageProcessor;
    width;
    height;
    constructor(constructorProps) {
        this.imageProcessor = new sharp_1.SharpImageProcessor();
    }
    async init(props) {
        this.attributesGetter = props.attributesGetter;
        this.tempRenderDir = path.join(props.cachePath, art_engine_1.CACHE.RENDERERS_TEMP_CACHE_DIR);
    }
    ;
    async render() {
        const renders = {};
        if (!fs.existsSync(this.tempRenderDir)) {
            fs.mkdirSync(this.tempRenderDir);
        }
        for (const [id, assets] of Object.entries(this.attributesGetter())) {
            const foundImage = assets.find((asset) => asset.kind == "ImageGenerator@v1");
            if (foundImage) {
                if (foundImage.data.assets.length < 1) {
                    throw new Error(`Couldn't find any supported set of attributes for the current item: ${id}`);
                }
                const outputPath = path.join(this.tempRenderDir, `${+id + 1}.png`);
                const temp_assets = foundImage.data.assets.map((obj) => ({ path: obj.path }));
                const tempImage = await sharp(temp_assets[0].path).metadata();
                try {
                    await this.imageProcessor.createImageWithLayers({
                        width: tempImage.width,
                        height: tempImage.height,
                        outputPath: outputPath,
                        assets: temp_assets,
                    });
                    renders[id] = [
                        {
                            kind: "ImageRender@v1",
                            data: {
                                path: outputPath
                            }
                        }
                    ];
                }
                catch (error) {
                    renders[id] = [
                        {
                            kind: "ImageRender@v1",
                            data: {
                                path: temp_assets + " : " + error
                            }
                        }
                    ];
                }
            }
        }
        return renders;
    }
}
exports.ImageRenderer = ImageRenderer;
