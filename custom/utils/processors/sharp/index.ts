import ImageProcessorInterface from "../../../processors/image-processing-interface";
import sharp from "sharp";
import fs from 'fs';
import path from 'path';

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
        inside: true
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
      .png({compressionLevel: 9, adaptiveFiltering: true})
      .toFile(createImageWithLayersProps.outputPath);
  }

  public async checkImageSize(dirPath: string, outputPath: string, width: number, height: number) {
    try {
      // Read all files in the directory
      const files = fs.readdirSync(dirPath);

      // Loop through each file and process it
      for (const file of files) {
        const filePath = path.join(dirPath, file);

        // Check if the file is an image
        if (!/(^|\/)\.[^\/\.]/g.test(file)) {

          const outputPathFile = path.join(outputPath, `${file}`); // Temporary file path

            await sharp(filePath).resize(width, height, {
              fit: sharp.fit.cover,
            }).toFile(outputPathFile);
        }
      }

    } catch (error) {
      console.error('Error processing images:', error);
    }
  }
}
