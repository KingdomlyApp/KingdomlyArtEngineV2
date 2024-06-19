import RendererInterface, { ItemsRenders, RendererInitPropsInterface } from "@hashlips-lab/art-engine/dist/common/renderers/renderer.interface";
import ItemsDataManager from "@hashlips-lab/art-engine/dist/utils/managers/items-data/items-data.manager";
interface MetaDataListInterface {
    path: string;
}
export declare class MetadataRenderer implements RendererInterface<MetaDataListInterface> {
    attributesGetter: ItemsDataManager["getAttributes"];
    private name;
    private description;
    tempRenderDir: string;
    constructor(constructorProps?: {
        name?: string;
        description?: string;
    });
    init(props: RendererInitPropsInterface): Promise<void>;
    private getAttributes;
    render(): Promise<ItemsRenders<MetaDataListInterface>>;
}
export {};
//# sourceMappingURL=metadataRenderer.d.ts.map