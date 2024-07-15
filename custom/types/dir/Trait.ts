import { Rules } from "./Rules"

export type Trait = {
  id: number,
  name: string,
  img_link: string,
  rarity: number,
  max_count: number,
  total_count: number,
  is_constant: boolean,
  rules?: Rules[]
}