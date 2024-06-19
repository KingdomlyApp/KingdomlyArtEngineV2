import RendererInterface, { ItemsRenders, RendererInitPropsInterface } from "@hashlips-lab/art-engine/dist/common/renderers/renderer.interface";
import ItemsDataManager from "@hashlips-lab/art-engine/dist/utils/managers/items-data/items-data.manager";
import ImageProcessorInterface from "../../processors/image-processor.interface";
interface ImageListInterface {
    path: string;
}
export declare class ImageRenderer implements RendererInterface<ImageListInterface> {
    attributesGetter: ItemsDataManager["getAttributes"];
    private tempRenderDir;
    private imageProcessor;
    private width;
    private height;
    constructor(constructorProps: {
        imageProcessor?: ImageProcessorInterface;
    });
    init(props: RendererInitPropsInterface): Promise<void>;
    render(): Promise<ItemsRenders<ImageListInterface>>;
}
export {};
//# sourceMappingURL=imageRenderer.d.ts.map