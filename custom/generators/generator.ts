import GeneratorInterface, {
    GeneratorInitPropsInterface,
    ItemsAttributes,
  } from "@hashlips-lab/art-engine/dist/common/generators/generator.interface";
  import InputsManager from "@hashlips-lab/art-engine/dist/utils/managers/inputs/inputs.manager";
  import { DIR } from "@/custom/types/dir/DIR";
  import { DNA } from "@/custom/types/DNA"
  
  interface Assets {
    path?: string,
    layername: string
    value: string
  }
  
  interface ImageDnaInterface {
    id: number,
    ooos_path?: string,
    assets: Assets[]
  }
  
  export class ImageGenerator
    implements GeneratorInterface<ImageDnaInterface>
  {
    inputsManager!: InputsManager;

    constructor(private dataKey: string, private dir: Map<string, DIR>, private dnaList: Map<string, DNA[]>){}
  
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

    private getAssetsOOOs = (layers: {layer_name: string, trait_name: string}[]) => {
      const assets = []
      for(var layer of layers){
        assets.push({
          layername: layer.layer_name,
          value: layer.trait_name
        })
      }
  
      return assets;
    }
    
  
    public async generate(): Promise<ItemsAttributes<ImageDnaInterface>> {
  
      let items: ItemsAttributes<ImageDnaInterface> = {};
      const inputsData = this.inputsManager.get(this.dataKey);
      let layerInputs = [];

      for(const [key, value] of this.dnaList){
        if(key === "one_of_ones_0" ||
          key === "one_of_ones_1" ||
          key === "one_of_ones_2" ||
          key === "one_of_ones"){
            layerInputs = inputsData.filter((item: any) => item.kind === "one_of_ones");
            for(const currentDnas of value){
              const ooos_items = layerInputs[0].elements.filter((item: any) => currentDnas.ooos?.layers[0].trait_name === item.name);
              items[parseInt(currentDnas.name.split("#")[1])] = [{
                kind: "OneOfOnes",
                data:{
                  id: parseInt(currentDnas.name.split("#")[1]),
                  ooos_path: ooos_items[0].path,
                  assets: this.getAssetsOOOs(currentDnas.ooos?.layers!)
                }
              }]
            }
          }
      }

      for(const [key, value] of this.dir){
          layerInputs = inputsData.filter((item: any) => item.kind === value.collection_name);
          for(const currentDnas of this.dnaList.get(key)!){
            items[parseInt(currentDnas.name.split("#")[1])] = [{
              kind: "ImageGenerator@v1",
              data: {
                id: parseInt(currentDnas.name.split("#")[1]),
                assets: this.getAssets(currentDnas.dna, layerInputs)
              }
            }]
          }
      }
      return items;
    }
  }
  