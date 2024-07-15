import * as path from "path";
import * as fs from "fs";
import RendererInterface, {
  ItemsRenders,
  RendererInitPropsInterface,
} from "@hashlips-lab/art-engine/dist/common/renderers/renderer.interface";
import ItemsDataManager from "@hashlips-lab/art-engine/dist/utils/managers/items-data/items-data.manager";
import { CACHE } from "@hashlips-lab/art-engine";
import { ItemPropertiesInterface } from "@hashlips-lab/art-engine/dist/utils/managers/items-data/items-data.interface";

interface AttributesInterface{
  trait_type: string,
  value: string,
}

interface MetaDataListInterface {
  // name: string,
  // description: string,
  // image: string,
  // date: string,
  // attributes: AttributesInterface[]
  path: string
}

export class MetadataRenderer
  implements RendererInterface<MetaDataListInterface>
{
  attributesGetter!: ItemsDataManager["getAttributes"];
  private name!: string;
  private description!: string;
  tempRenderDir!: string;
  

  constructor(
    constructorProps: {
      name?: string
      description?: string;
    } = {}
  ) {
    this.name = constructorProps.name ? constructorProps.name : "";
    this.description = constructorProps.description
      ? constructorProps.description
      : "";
  }

  public async init(props: RendererInitPropsInterface): Promise<void> {
    this.attributesGetter = props.attributesGetter;
    this.tempRenderDir = path.join(props.cachePath, CACHE.RENDERERS_TEMP_CACHE_DIR)
  };

  private getAttributes = (assets: any[]) => {
    const tempData = []
    
    // assets.forEach(asset => {
    //   return tempData.push({
    //     trait_type: asset.layername,
    //     value: asset.value
    //   })
    // })

    for(var asset of assets){
      tempData.push({
        trait_type: asset.layername,
        value: asset.value
      })
    }

    return tempData;
  }

  public async render(): Promise<ItemsRenders<MetaDataListInterface>> {
    const renders: ItemsRenders<MetaDataListInterface> = {};

    if(!fs.existsSync(this.tempRenderDir)){
      fs.mkdirSync(this.tempRenderDir);
    }

    for (const [id, assets] of Object.entries(this.attributesGetter())){
      const foundImage = (assets as ItemPropertiesInterface<any>[]).find((asset: ItemPropertiesInterface<any>) => asset.kind == "ImageGenerator@v1");

      if(foundImage) {
        let metadata = {
          name: this.name + " #" + (+id + 1),
          description: this.description,
          image: path.join(this.tempRenderDir, `${+id + 1}.png`),
          date: Date.now(),
          attributes: this.getAttributes(foundImage.data.assets)

        }

        const outputPath = path.join(this.tempRenderDir, `${+id + 1}.json`)
        fs.writeFileSync(
          outputPath,
          JSON.stringify(metadata, null, 2)
        );

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
        ]
      }
    }
    return renders;
  }
}
