"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SharpImageProcessor = void 0;
const sharp_1 = __importDefault(require("sharp"));
class SharpImageProcessor {
    async createImageWithLayers(createImageWithLayersProps) {
        let normalizedAssets = [];
        for (const asset of createImageWithLayersProps.assets) {
            normalizedAssets.push({
                input: asset.path,
            });
        }
        await (0, sharp_1.default)({
            create: {
                width: createImageWithLayersProps.width,
                height: createImageWithLayersProps.height,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 },
            },
        })
            .composite(normalizedAssets)
            .toFile(createImageWithLayersProps.outputPath);
    }
}
exports.SharpImageProcessor = SharpImageProcessor;
