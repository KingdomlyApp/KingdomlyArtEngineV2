// Defining the structure of a single trait
interface Trait {
    trait_type: string;
    value: string;
  }
  
  // Defining the structure of the object that contains the traits and other properties
  export interface NFTMetadata {
    attributes: Trait[]; // An array of traits
    date: number; // Presumably a timestamp
    description: string; // Description of the character
    image: string; // URL of the character's image
    name: string; // Name of the character
  }
  