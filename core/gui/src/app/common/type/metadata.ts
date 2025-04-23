export interface Metadata {
  mid?: number;
  name: string;
  description?: string;
  ownerUid?: number;
  storagePath?: string;
  creationTime?: string;
  isPublic: boolean;

  contributors?: {
    name: string;
    creator?: boolean;
    role: string;
    affiliation: string;
    email: string;
  }[];

  funders?: {
    name: string;
    awardTitle: string;
  }[];

  specimens?: {
    id: string;
    species: string;
    age?: {
      value?: number;
      unit?: string;
    };
    sex?: string;
    notes?: string;
  }[];
}
