import { NFTMetadata } from "@/custom/types/NFT";
export default function main(metadata: NFTMetadata[]): Promise<{
    img_cid: string;
    metadata_cid: import("nft.storage/dist/src/lib/interface").CIDString;
    metadataList: NFTMetadata[];
}>;
//# sourceMappingURL=ipfs-upload.d.ts.map