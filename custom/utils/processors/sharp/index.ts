import ImageProcessorInterface from "../../../processors/image-processing-interface";
import sharp from "sharp";

export class SharpImageProcessor implements ImageProcessorInterface {
  public async createImageWithLayers(createImageWithLayersProps: {
    width: number;
    height: number;
    outputPath: string;
    assets: {
      path: string;
    }[];
  }): Promise<void> {
    let normalizedAssets: any = [];

    for (const asset of createImageWithLayersProps.assets) {
      normalizedAssets.push({
        input: asset.path,
      });
    }

    await sharp({
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
