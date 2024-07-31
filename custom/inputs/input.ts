import InputInterface, {
    InputInitPropsInterface,
  } from "@hashlips-lab/art-engine/dist/common/inputs/input.interface";
import { DIR } from "@/custom/types/dir/DIR";
  
  const fs = require("fs");
  
  interface Elements {
    id: number;
    name: string;
    filename: string;
    path: string;
  }
  
  interface LayerInterface {
    kind: string,
    id: number;
    elements: Elements[]
    name: string;
  }
  
  export class LayersInput implements InputInterface<LayerInterface[]> {

    constructor(private layersPath: string, private dir: Map<string, DIR>){}
  
    public async init(props: InputInitPropsInterface): Promise<void> {}
  
    private getElements = (path: string) => {
      return fs.readdirSync(path).filter((item: string) => !/(^|\/)\.[^\/\.]/g.test(item)).map((i: string, index: number) => {
        if(i.includes("-")){
          throw new Error(
            `layer name can not contain dashes, please fix: ${i}`
          );
        }
        return {
          id: index,
          name: i.slice(0, -4),
          filename: i,
          path: `${path}/${i}`
        }
      })
    }
  
    public async load(): Promise<LayerInterface[]> {


      let layers: LayerInterface[] = [];
  
      var index = 0;

      for(const [key, value] of this.dir){
        // for(const currentDir of value){
        //   let i = 0;
          for(const layer of value.layers){
            layers[index] = {
              kind: value.collection_name,
              id: +index,
              elements: this.getElements(`${this.layersPath}/${value.collection_name}/${layer.name}`),
              name: layer.name
            }
            index++;
          }
        // }
      }

      if(fs.existsSync(`${this.layersPath}/one_of_ones`)){
        layers[index] = {
          kind: "one_of_ones",
          id: +index,
          elements: this.getElements(`${this.layersPath}/one_of_ones`),
          name: "one_of_ones"
        }
      }


      return layers;
    }
  }
  