export type Rules = {
  current_layer_name: string,
  comparing_to_layer_name: string,
  current_trait_id: number,
  comparing_to_trait_id: number[],
  condition: "doesn't mix with" | "must pairs with" | "always pairs with"
}