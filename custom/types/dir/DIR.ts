import { Layer } from "./Layer"

/**
 * Documentation:
 * 
 * 1. layers
 *    Map<layer_name, Layer>
 */
export type DIR = {
  collection_name: string,
  layers: Layer[]
}