import InputInterface, { InputInitPropsInterface } from "@hashlips-lab/art-engine/dist/common/inputs/input.interface";
interface Elements {
    id: number;
    name: string;
    filename: string;
    path: string;
}
interface LayerInterface {
    kind: string;
    id: number;
    elements: Elements[];
    name: string;
}
export declare class LayersInput implements InputInterface<LayerInterface[]> {
    private layersPath;
    private layerConfigurations;
    constructor(layersPath: string, layerConfigurations: {
        growEditionSizeTo: number;
        editionName: string;
        layersOrder: {
            name: string;
        }[];
        dnaList: number[][];
    }[]);
    init(props: InputInitPropsInterface): Promise<void>;
    private getElements;
    load(): Promise<LayerInterface[]>;
}
export {};
//# sourceMappingURL=input.d.ts.map