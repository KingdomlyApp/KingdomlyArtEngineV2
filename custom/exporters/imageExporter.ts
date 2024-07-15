import * as path from "path";
import * as fs from "fs";
import ExporterInterface, {
  ExporterInitPropsInterface,
} from "@hashlips-lab/art-engine/dist/common/exporters/exporter.interface";
import ItemsDataManager from "@hashlips-lab/art-engine/dist/utils/managers/items-data/items-data.manager";
import { ItemPropertiesInterface } from "@hashlips-lab/art-engine/dist/utils/managers/items-data/items-data.interface";
import  ipfsUpload  from "../utils/lib/ipfs-upload"
import { NFTMetadata } from "@/custom/types/NFT";

export class ImageExporter implements ExporterInterface {
  private rendersGetter!: ItemsDataManager["getRenders"];
  private outputPath!: string;

  constructor(private projectName: string){}

  public async init(props: ExporterInitPropsInterface) {
    this.rendersGetter = props.rendersGetter;
    this.outputPath = props.outputPath;
  }

  private async uploadMetadataToIPFS(metadata: NFTMetadata[]) {
    return new Promise<{
      img_cid: string;
      metadata_cid: string;
      baseURI: string;
    }>(async (resolve, reject) => {
      try {
        const metadataCopy = JSON.parse(
          JSON.stringify(
            metadata.sort(
              (a, b) =>
                Number(a.name.split("#")[1]) - Number(b.name.split("#")[1])
            )
          )
        );
        const { metadata_cid, img_cid, metadataList } = await ipfsUpload(metadataCopy, this.projectName);

        let baseURI = `ipfs://${metadata_cid}/`;
        fs.writeFileSync(path.join(this.outputPath, "_metadata.json"), JSON.stringify(metadataList, null, 2));

        resolve({
          img_cid,
          metadata_cid,
          baseURI,
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  public async export(): Promise<void> {
    if(!fs.existsSync(this.outputPath)){
      fs.mkdirSync(this.outputPath);
    }

    let metadataList = [];

    for(const [_, renders] of Object.entries(this.rendersGetter())){
      let jsonDataAndPath = (renders as ItemPropertiesInterface<any>[]).find((render: ItemPropertiesInterface<any>) => "MetadataRenderer@v1" === render.kind);

      if(jsonDataAndPath){
        const fileContent = fs.readFileSync(jsonDataAndPath.data.path, "utf8");

        metadataList.push(JSON.parse(fileContent));
      } 
    }

    fs.writeFileSync(path.join(this.outputPath, "_metadata.json"), JSON.stringify(metadataList, null, 2));

    const {img_cid, metadata_cid, baseURI} = await this.uploadMetadataToIPFS(metadataList);

    const cid = {
      img_cid: img_cid,
      metadata_cid: metadata_cid,
    }

    fs.writeFileSync(path.join(this.outputPath, "cid.json"), JSON.stringify(cid))
  }
}
