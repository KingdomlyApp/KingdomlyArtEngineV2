import GeneratorInterface, { GeneratorInitPropsInterface, ItemsAttributes } from "@hashlips-lab/art-engine/dist/common/generators/generator.interface";
import InputsManager from "@hashlips-lab/art-engine/dist/utils/managers/inputs/inputs.manager";
interface Assets {
    path: string;
    layername: string;
    value: string;
}
interface ImageDnaInterface {
    id: number;
    assets: Assets[];
}
export declare class ImageGenerator implements GeneratorInterface<ImageDnaInterface> {
    private dataKey;
    private layerConfigurations;
    inputsManager: InputsManager;
    constructor(dataKey: string, layerConfigurations: {
        growEditionSizeTo: number;
        editionName: string;
        layersOrder: {
            name: string;
        }[];
        dnaList: number[][];
    }[]);
    init(props: GeneratorInitPropsInterface): Promise<void>;
    private getAssets;
    generate(): Promise<ItemsAttributes<ImageDnaInterface>>;
}
export {};
//# sourceMappingURL=generator.d.ts.map