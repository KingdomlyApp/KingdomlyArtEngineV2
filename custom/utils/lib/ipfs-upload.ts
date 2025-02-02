import { NFTMetadata } from "@/custom/types/NFT";
import { NFTStorage, File } from "nft.storage";
import * as fs from 'fs';
const { setGlobalDispatcher, Agent } = require('undici');

// Set up the custom undici agent with timeouts up to 2 hours
setGlobalDispatcher(
  new Agent({
    keepAliveTimeout: 5 * 60 * 60 * 1000,  // Keep alive for 2 hours
    headersTimeout: 5 * 60 * 60 * 1000,    // 2 hours for header timeout
    bodyTimeout: 5 * 60 * 60 * 1000        // 2 hours for body timeout
  })
);

// Utility function to convert a ReadStream to a Buffer
function streamToBuffer(stream: fs.ReadStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}


async function storeAndModifyMetadata(
  metadata: NFTMetadata[],
  collectionName: string,
  isSingleAsset: boolean
) {
  const batchSize = 500;
  let batchStart = 0;
  let allMedia = [];
  let updatedMetadata: any[] = [];
  const binaryCache: Record<string, Uint8Array> = {};

  // For single assets, we only need to process the first image
  if (isSingleAsset && metadata.length > 0) {
    const firstItem = metadata[0];
    const uri = {
      media: firstItem.image,
      name: firstItem.name.split("#")[1],
    };
    
    const fileType = uri.media.match(/\.(\w+)$/)?.[1] || "png";
    const mediaBuffer = await streamToBuffer(fs.createReadStream(uri.media));
    const mediaFile = new File([mediaBuffer], `asset.${fileType}`, { type: fileType });
    
    // Upload single asset and get CID
    const cid = await storeToIPFS([mediaFile], collectionName, true);
    
    // Update all metadata items to point to the same asset
    updatedMetadata = metadata.map(metadatum => ({
      ...metadatum,
      image: `ipfs://${cid}/`
    }));

    return { media_cid: cid, updatedMetadata };
  }

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

        // let mediaFile = new File([fs.readFileSync(uri.media)], `${uri.name}.${fileType}`, {type: fileType});

        const mediaBuffer = await streamToBuffer(fs.createReadStream(uri.media));
        let mediaFile = new File([mediaBuffer], `${uri.name}.${fileType}`, { type: fileType });

        metadatum.image = `ipfs://{cid}/${uri.name}.${fileType}`; // placeholder for actual CID
        updatedMetadata.push(metadatum);

        return mediaFile;
      })
    );

    allMedia.push(...currentMedia);
  }

  const cid = await storeToIPFS(allMedia, collectionName, false);

  // Update metadata with actual CID
  updatedMetadata.forEach((meta) => {
    meta.image = meta.image.replace("{cid}", cid);
  });

  return { media_cid: cid, updatedMetadata: updatedMetadata };
}

export default async function main(
  metadata: NFTMetadata[],
  collectionName: string,
  isSingleAsset: boolean
) {
  const { media_cid, updatedMetadata } = await storeAndModifyMetadata(
    metadata,
    collectionName,
    isSingleAsset
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

async function storeToIPFS(files: File[], collectionName: string, isSingleAsset: boolean = false) {
  const formData = new FormData();
  files.forEach((file, index) => {
    // Only use collection name path if not a single asset
    const fileName = isSingleAsset ? file.name : `${collectionName}/${file.name}`;
    formData.append("file", file, fileName);
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
