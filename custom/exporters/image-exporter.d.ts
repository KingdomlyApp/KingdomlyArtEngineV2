import ExporterInterface, { ExporterInitPropsInterface } from "@hashlips-lab/art-engine/dist/common/exporters/exporter.interface";
export declare class ImageExporter implements ExporterInterface {
    private rendersGetter;
    private outputPath;
    init(props: ExporterInitPropsInterface): Promise<void>;
    private uploadMetadataToIPFS;
    export(): Promise<void>;
}
//# sourceMappingURL=image-exporter.d.ts.map