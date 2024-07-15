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

        // let mediaFile;
        // let fileType = uri.media.match(/\.(\w+)$/)?.[1] || "png";
        // let mimeType =
        //   fileType === "mp4"
        //     ? "video/mp4"
        //     : `image/${fileType === "jpg" ? "jpeg" : fileType}`;

        // if (binaryCache[uri.media]) {
        //   mediaFile = new File(
        //     [binaryCache[uri.media]],
        //     `${uri.name}.${fileType}`,
        //     { type: mimeType }
        //   );
        // } else {
        //   if (uri.media.startsWith("data:")) {
        //     const binaryData = convertDataURIToBinary(uri.media);
        //     binaryCache[uri.media] = binaryData;
        //     mediaFile = new File([binaryData], `${uri.name}.${fileType}`, {
        //       type: mimeType,
        //     });
        //   } else {
        //     const dataUrl = await convertImageToBase64(uri.media);
        //     const binaryData = convertDataURIToBinary(dataUrl);
        //     binaryCache[uri.media] = binaryData;
        //     mediaFile = new File([binaryData], `${uri.name}.${fileType}`, {
        //       type: mimeType,
        //     });
        //   }
        // }
        // metadatum.image = `ipfs://{cid}/${uri.name}.${fileType}`; // placeholder for actual CID
        // updatedMetadata.push(metadatum);
        // return mediaFile;
      })
    );

    allMedia.push(...currentMedia);
  }

  // const storage = new NFTStorage({ token: NFT_STORAGE_KEY as string });
  // const cid = await storage.storeDirectory(allMedia as any);


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


// import { NFTMetadata } from "@/custom/types/NFT";
// import { NFTStorage, File } from "nft.storage";
// import * as fs from 'fs';
// import dotenv from 'dotenv';

// dotenv.config();

// const NFT_STORAGE_KEY = process.env.NFT_STORAGE_KEY;

// let convertDataURIToBinary = (dataURI: any) => {
//   var BASE64_MARKER = ";base64,";
//   var base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
//   var base64 = dataURI.substring(base64Index);
//   var buffer = Buffer.from(base64, 'base64');
  
//   return new Uint8Array(buffer);
// };

// const convertImageToBase64 = async (imageUrl: string) => {
//   try {
//     // const response = await fetch(imageUrl, { cache: "reload" });
//     const imageBuffer = fs.readFileSync(imageUrl);
//     const base64Image = imageBuffer.toString('base64');

//     return base64Image;
//   } catch (error) {
//     console.error("Error converting image to base64:", error);
//   }
// };

// async function storeImages(metadata: NFTMetadata[]) {
//   const batchSize = 500; // Number of images to process in a single batch
//   let batchStart = 0;
//   let allImages = [];
//   const binaryCache: Record<string, Uint8Array> = {}; // Cache for storing already converted binary data

//   while (batchStart < metadata.length) {
//     // Get the current batch of metadata
//     const currentBatch = metadata.slice(batchStart, batchStart + batchSize);
//     batchStart += batchSize;

//     // Process the current batch
//     const currentImages = await Promise.all(
//       currentBatch.map(async (metadatum) => {
//         const uri = {
//           img: metadatum.image,
//           name: metadatum.name.split("#")[1],
//         };

//         let imageFile = new File([fs.readFileSync(uri.img)], `${uri.name}.png`, { type: "image/png"});

//         return imageFile;
//       })
//     );
//     // Accumulate the processed images from the current batch
//     allImages.push(...currentImages);
//   }

//   // After all batches are processed, store all images at once
//   const storage = new NFTStorage({ token: NFT_STORAGE_KEY as string });
//   const cid = await storage.storeDirectory(allImages as any);
//   return cid;
// }

// async function storeMetadataJSONs(metadata: NFTMetadata[]) {
//   //Converts Objects to Blobs and stores it in as an array
//   const jsonBlobs = metadata.map((metadatum, i) => {
//     const jsonBlob = new File(
//       [JSON.stringify(metadatum)],
//       `${metadatum.name.split("#")[1]}`,
//       {
//         type: "application/json",
//       }
//     );
//     return jsonBlob;
//   });

//   const storage = new NFTStorage({ token: NFT_STORAGE_KEY as string });
//   const car = await NFTStorage.encodeDirectory(jsonBlobs);
//   const cid = await storage.storeCar(car.car);
//   return cid;
// }

// async function updateMetadataImages(
//   cidString: string,
//   metadata: NFTMetadata[]
// ) {
//   //For each metadata file, update the image property to the CID of the image file
//   metadata.forEach((metadatum) => {
//     metadatum.image = `ipfs://${cidString}/${metadatum.name.split("#")[1]}.png`;
//   });
// }

// export default async function main(metadata: NFTMetadata[]) {
//   let img_cid = "";
//   img_cid = await storeImages(metadata);
//   await updateMetadataImages(img_cid, metadata);

//   const metadata_cid = await storeMetadataJSONs(metadata);
//   return { img_cid: img_cid, metadata_cid: metadata_cid, metadataList: metadata };
// }
