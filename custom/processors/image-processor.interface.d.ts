export default interface ImageProcessorInterface {
    createImageWithLayers: (createImageWithLayers: {
        width: number;
        height: number;
        outputPath: string;
        assets: {
            path: string;
        }[];
    }) => Promise<void>;
}
//# sourceMappingURL=image-processor.interface.d.ts.map