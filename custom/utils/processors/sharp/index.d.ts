import ImageProcessorInterface from "../../../processors/image-processor.interface";
export declare class SharpImageProcessor implements ImageProcessorInterface {
    createImageWithLayers(createImageWithLayersProps: {
        width: number;
        height: number;
        outputPath: string;
        assets: {
            path: string;
        }[];
    }): Promise<void>;
}
//# sourceMappingURL=index.d.ts.map