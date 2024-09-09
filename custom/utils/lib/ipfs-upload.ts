import { NFTMetadata } from "@/custom/types/NFT";
import { NFTStorage, File } from "nft.storage";
import * as fs from 'fs';

const NFT_STORAGE_KEY = process.env.NEXT_PUBLIC_NFT_STORAGE_KEY;

let convertDataURIToBinary = (dataURI: any) => {
  var BASE64_MARKER = ";base64,";
  var base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
  var base64 = dataURI.substring(base64Index);
  var raw = window.atob(base64);
  var rawLength = raw.length;
  var array = new Uint8Array(new ArrayBuffer(rawLength));

  for (var i = 0; i < rawLength; i++) {
    array[i] = raw.charCodeAt(i);
  }
  return array;
};

const convertImageToBase64 = async (imageUrl: string) => {
  try {
    const response = await fetch(imageUrl, { cache: "reload" });
    const blob = await response.blob();

    const url = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    return url;
  } catch (error) {
    console.error("Error converting image to base64:", error);
  }
};

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
    signal: AbortSignal.timeout(3600000)
  });


  const resData = await res.json();
  const cid = resData.IpfsHash;
  
  return cid;
}
