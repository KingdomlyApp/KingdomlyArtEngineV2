export type DNA = {
  name: string,
  description: string,
  dna: number[],
  rarity_score: number,
  ooos?: {url: string, layers: {layer_name: string, trait_name: string}[]}
}