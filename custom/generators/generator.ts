import GeneratorInterface, {
    GeneratorInitPropsInterface,
    ItemsAttributes,
  } from "@hashlips-lab/art-engine/dist/common/generators/generator.interface";
  import InputsManager from "@hashlips-lab/art-engine/dist/utils/managers/inputs/inputs.manager";
  import { DIR } from "@/custom/types/dir/DIR";
  import { DNA } from "@/custom/types/DNA"
  
  interface Assets {
    path: string,
    layername: string
    value: string
  }
  
  interface ImageDnaInterface {
    id: number,
    assets: Assets[]
  }
  
  export class ImageGenerator
    implements GeneratorInterface<ImageDnaInterface>
  {
    inputsManager!: InputsManager;

    constructor(private dataKey: string, private dir: Map<string, DIR[]>, private dnaList: Map<string, DNA[]>){}
  
    public async init(props: GeneratorInitPropsInterface): Promise<void> {
      this.inputsManager = props.inputsManager;
    }
  
    private getAssets = (dna: number[], inputsData: any) => {
      const assets = []
      for(var index in dna){
        assets.push({
          path: inputsData[index].elements[dna[index]].path,
          layername: inputsData[index].name,
          value: inputsData[index].elements[dna[index]].name
        })
      }
  
      return assets;
    }
  
    public async generate(): Promise<ItemsAttributes<ImageDnaInterface>> {
  
      let items: ItemsAttributes<ImageDnaInterface> = {};
      const inputsData = this.inputsManager.get(this.dataKey);
      let layerInputs = [];
  
      var index = 0;

      for(const [key, value] of this.dir){
        for(const currentDir of value){
          layerInputs = inputsData.filter((item: any) => item.kind === currentDir.collection_name);
          for(const currentDnas of this.dnaList.get(key)!){
            items[index] = [{
              kind: "ImageGenerator@v1",
              data: {
                id: +index + 1,
                assets: this.getAssets(currentDnas.dna, layerInputs)
              }
            }]
            index++;
          }
        }
      }
      return items;
    }
  }
  