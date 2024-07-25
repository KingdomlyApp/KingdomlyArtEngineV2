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

  constructor(constructorProps: {
    imageProcessor?: ImageProcessorInterface;
  }) {
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

    for (const [id, assets] of Object.entries(this.attributesGetter())){
      const foundImage = (assets as ItemPropertiesInterface<any>[]).find((asset: ItemPropertiesInterface<any>) => asset.kind == "ImageGenerator@v1");

      if(foundImage) {
        if(foundImage.data.assets.length < 1){
            throw new Error(`Couldn't find any supported set of attributes for the current item: ${id}`);
        }

        const outputPath = path.join(this.tempRenderDir, `${+id}.png`)
        const temp_assets: { path: string}[] = foundImage.data.assets.map((obj: {path: string, layername: string, value: string}) => ({path: obj.path}));

        const tempImage = await sharp(temp_assets[0].path).metadata();

        try{
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
          ]
        } catch(error){

          renders[id] = [
            {
              kind: "ImageRender@v1",
              data: {
                path: temp_assets + " : " + error
              }
            }
          ]
        }

      }
    }
    return renders;
  }
}
