import { NFTMetadata } from "@/custom/types/NFT";
import { NFTStorage, File } from "nft.storage";
import * as fs from 'fs';
const { setGlobalDispatcher, Agent } = require('undici');

// Set up the custom undici agent with timeouts up to 2 hours
setGlobalDispatcher(
  new Agent({
    keepAliveTimeout: 2 * 60 * 60 * 1000,  // Keep alive for 2 hours
    headersTimeout: 2 * 60 * 60 * 1000,    // 2 hours for header timeout
    bodyTimeout: 2 * 60 * 60 * 1000        // 2 hours for body timeout
  })
);

async function storeAndModifyMetadata(
  metadata: NFTMetadata[],
  collectionName: string
) {
  const batchSize = 500;
  let batchStart = 0;
  let allMedia = [];
  let updatedMetadata: any[] = [];
  const binaryCache: Record<string, Uint8Array> = {};

  while (batchStart < metadata.length) {
    const currentBatchSize = Math.min(batchSize, metadata.length - batchStart);
    const currentBatch = metadata.slice(
      batchStart,
      batchStart + currentBatchSize
    );
    batchStart += currentBatchSize;

    const currentMedia = await Promise.all(
      currentBatch.map(async (metadatum) => {
        const uri = {
          media: metadatum.image,
          name: metadatum.name.split("#")[1],
        };

        let fileType = uri.media.match(/\.(\w+)$/)?.[1] || "png";

        let mediaFile = new File([fs.readFileSync(uri.media)], `${uri.name}.${fileType}`, {type: fileType});

        metadatum.image = `ipfs://{cid}/${uri.name}.${fileType}`; // placeholder for actual CID
        updatedMetadata.push(metadatum);

        return mediaFile;
      })
    );

    allMedia.push(...currentMedia);
  }

  const cid = await storeToIPFS(allMedia, collectionName);

  // Update metadata with actual CID
  updatedMetadata.forEach((meta) => {
    meta.image = meta.image.replace("{cid}", cid);
  });

  return { media_cid: cid, updatedMetadata: updatedMetadata };
}

export default async function main(
  metadata: NFTMetadata[],
  collectionName: string
) {
  const { media_cid, updatedMetadata } = await storeAndModifyMetadata(
    metadata,
    collectionName
  );
  const jsonFiles = updatedMetadata.map(
    (meta) =>
      new File([JSON.stringify(meta)], `${meta.name.split("#")[1]}`, {
        type: "application/json",
      })
  );

  const metadata_cid = await storeToIPFS(jsonFiles, collectionName);

  return { img_cid: media_cid, metadata_cid: metadata_cid, metadataList: updatedMetadata};
}

async function storeToIPFS(files: File[], collectionName: string) {
  const formData = new FormData();
  files.forEach((file, index) => {
    formData.append("file", file, `${collectionName}/${file.name}`);
  });

  const _metadata = JSON.stringify({
    name: collectionName,
  });
  formData.append("pinataMetadata", _metadata);

  const options = JSON.stringify({
    cidVersion: 1,
    wrapWithDirectory: false,
  });

  formData.append("pinataOptions", options);

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
    },
    body: formData,
  });


  const resData = await res.json();
  const cid = resData.IpfsHash;
  
  return cid;
}
