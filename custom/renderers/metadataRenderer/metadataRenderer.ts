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
  path: string
}

export class MetadataRenderer
  implements RendererInterface<MetaDataListInterface>
{
  attributesGetter!: ItemsDataManager["getAttributes"];
  private ooosPath!: string;
  tempRenderDir!: string;
  

  constructor(
    constructorProps: {
      ooosPath?: string;
    } = {}
  ) {
      this.ooosPath = constructorProps.ooosPath ? constructorProps.ooosPath : "";
  }

  public async init(props: RendererInitPropsInterface): Promise<void> {
    this.attributesGetter = props.attributesGetter;
    this.tempRenderDir = path.join(props.cachePath, CACHE.RENDERERS_TEMP_CACHE_DIR)
  };

  private getAttributes = (assets: any[]) => {
    const tempData = []

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
          name: foundImage.data.token_name,
          description: foundImage.data.token_description,
          image: path.join(this.tempRenderDir, `${+id}.png`),
          date: Date.now(),
          attributes: this.getAttributes(foundImage.data.assets)

        }

        const outputPath = path.join(this.tempRenderDir, `${+id}.json`)
        fs.writeFileSync(
          outputPath,
          JSON.stringify(metadata, null, 2)
        );

        renders[id] = [
          {
            kind: "MetadataRenderer@v1",
            data: {
              path: outputPath
            }
          }
        ]
      }

      const foundOOOs = (assets as ItemPropertiesInterface<any>[]).find((asset: ItemPropertiesInterface<any>) => asset.kind == "OneOfOnes");

      if(foundOOOs) {
        let metadata = {
          name: foundOOOs.data.token_name,
          description: foundOOOs.data.token_description,
          image: path.join(this.ooosPath, `${foundOOOs?.data.ooos_path.split("one_of_ones/")[1]}`),
          date: Date.now(),
          attributes: this.getAttributes(foundOOOs.data.assets)

        }

        const outputPath = path.join(this.tempRenderDir, `${+id}.json`)
        fs.writeFileSync(
          outputPath,
          JSON.stringify(metadata, null, 2)
        );

        renders[id] = [
          {
            kind: "MetadataRenderer@v1",
            data: {
              path: outputPath
            }
          }
        ]
      }
    }
    return renders;
  }
}
