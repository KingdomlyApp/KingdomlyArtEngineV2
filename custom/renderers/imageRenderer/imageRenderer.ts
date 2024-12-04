import * as path from "path";
import * as fs from "fs";
import RendererInterface, {
  ItemsRenders,
  RendererInitPropsInterface,
} from "@hashlips-lab/art-engine/dist/common/renderers/renderer.interface";
import ItemsDataManager from "@hashlips-lab/art-engine/dist/utils/managers/items-data/items-data.manager";
import ImageProcessorInterface from "../../processors/image-processing-interface";
import { CACHE } from "@hashlips-lab/art-engine";
import { ItemPropertiesInterface } from "@hashlips-lab/art-engine/dist/utils/managers/items-data/items-data.interface";
import { SharpImageProcessor } from "../../utils/processors/sharp"
import FirebaseDB from "../../utils/lib/FirebaseDB";
const sharp = require("sharp");

interface ImageListInterface {
  path: string
}

export class ImageRenderer
  implements RendererInterface<ImageListInterface>
{
  attributesGetter!: ItemsDataManager["getAttributes"];
  private tempRenderDir!: string;
  private imageProcessor!: ImageProcessorInterface;
  private projectId: string;
  private firebaseDB: FirebaseDB;

  constructor(constructorProps: {
    projectId: string;
    firebaseDB: FirebaseDB;
    imageProcessor?: ImageProcessorInterface;
  }) {
    this.projectId = constructorProps.projectId;
    this.firebaseDB = constructorProps.firebaseDB;
    this.imageProcessor = new SharpImageProcessor();

  }

  public async init(props: RendererInitPropsInterface): Promise<void> {
    this.attributesGetter = props.attributesGetter;
    this.tempRenderDir = path.join(props.cachePath, CACHE.RENDERERS_TEMP_CACHE_DIR)
  };

  public async render(): Promise<ItemsRenders<ImageListInterface>> {
    const renders: ItemsRenders<ImageListInterface> = {};

    if(!fs.existsSync(this.tempRenderDir)){
      fs.mkdirSync(this.tempRenderDir);
    }

    const items = Object.entries(this.attributesGetter());
    const totalCount = items.length;
    const updateInterval = Math.floor(totalCount / 10);
    const batchSize = 10;
    let processedCount = 0;

    const processImage = async (id: string, assets: ItemPropertiesInterface<any>[]) => {
      const foundImage = assets.find((asset) => asset.kind === "ImageGenerator@v1");
      const outputPath = path.join(this.tempRenderDir, `${+id}.png`);

      if (fs.existsSync(outputPath)) {
        return { id, renderData: [{ kind: "ImageRender@v1", data: { path: outputPath } }] };
      } else if (foundImage) {
        if (foundImage.data.assets.length < 1) {
          throw new Error(`Couldn't find any supported set of attributes for the current item: ${id}`);
        }

        const tempAssets = foundImage.data.assets.map((obj: { path: string }) => ({ path: obj.path }));
        const tempImage = await sharp(tempAssets[0].path).metadata();

        try {
          await this.imageProcessor.createImageWithLayers({
            width: tempImage.width,
            height: tempImage.height,
            outputPath,
            assets: tempAssets,
          });
          return { id, renderData: [{ kind: "ImageRender@v1", data: { path: outputPath } }] };
        } catch (error) {
          return {
            id,
            renderData: [
              {
                kind: "ImageRender@v1",
                data: { path: tempAssets + " : " + error },
              },
            ],
          };
        }
      }
    };

    const processBatches = async () => {
      let nextUpdatePercent = 10;
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);

        const batchResults = await Promise.allSettled(
          batch.map(async ([id, assets]) => {
            return processImage(id, assets as ItemPropertiesInterface<any>[]);
          })
        );

        batchResults.forEach((result, index) => {
          if (result.status === "fulfilled") {
            const { value } = result;
            if (value) {
              const { id, renderData } = value;
              renders[id] = renderData;
            }
          } else {
            console.error(`Error processing item with ID ${batch[index][0]}:`, result.reason);
          }
        });

        processedCount += batch.length; // Update processedCount for the batch
        if (processedCount >= (totalCount * nextUpdatePercent)/100) {
          await this.firebaseDB.updateGenerationPercent(
            this.projectId,
            (nextUpdatePercent / 10) * 8
          );
          nextUpdatePercent += 10;
        }
      }
    };

    await processBatches();
    return renders;

    // const totalCount = Object.entries(this.attributesGetter()).length;
    // const updateInterval = Math.floor(totalCount/10);

    // let processedCount = 0;

    // for (const [id, assets] of Object.entries(this.attributesGetter())){
    //   const foundImage = (assets as ItemPropertiesInterface<any>[]).find((asset: ItemPropertiesInterface<any>) => asset.kind == "ImageGenerator@v1");

    //   if(fs.existsSync(path.join(this.tempRenderDir, `${+id}.png`))){
    //     renders[id] = [
    //       {
    //           kind: "ImageRender@v1",
    //           data: {
    //               path: path.join(this.tempRenderDir, `${+id}.png`)
    //           }
    //       }
    //   ]
    //   }
    //   else{
    //     if(foundImage) {
    //       if(foundImage.data.assets.length < 1){
    //           throw new Error(`Couldn't find any supported set of attributes for the current item: ${id}`);
    //       }

    //       const outputPath = path.join(this.tempRenderDir, `${+id}.png`)
    //       const temp_assets: { path: string}[] = foundImage.data.assets.map((obj: {path: string, layername: string, value: string}) => ({path: obj.path}));
    //       const tempImage = await sharp(temp_assets[0].path).metadata();

    //       try{
    //         await this.imageProcessor.createImageWithLayers({
    //             width: tempImage.width,
    //             height: tempImage.height,
    //             outputPath: outputPath,
    //             assets: temp_assets,
    //         });
    //         renders[id] = [
    //             {
    //                 kind: "ImageRender@v1",
    //                 data: {
    //                     path: outputPath
    //                 }
    //             }
    //         ]
    //       } catch(error){

    //         renders[id] = [
    //           {
    //             kind: "ImageRender@v1",
    //             data: {
    //               path: temp_assets + " : " + error
    //             }
    //           }
    //         ]
    //       }

    //       processedCount++;
    //     }

    //     const foundOOOs = (assets as ItemPropertiesInterface<any>[]).find((asset: ItemPropertiesInterface<any>) => asset.kind == "OneOfOnes");

    //     if(foundOOOs){
    //       processedCount++;
    //     }

    //     if(processedCount % updateInterval === 0 || processedCount === totalCount){
    //       await this.firebaseDB.updateGenerationPercent(this.projectId, Math.ceil((processedCount/totalCount)*80))
    //     }
    //   }
    // }
    // return renders;
  }
}
