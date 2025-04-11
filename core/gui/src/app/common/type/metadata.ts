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
    contributorType: string;
    roleOther?: string;
    affiliation: string;
    email: string;
  }[];

  funders?: {
    name: string;
    awardTitle: string;
  }[];

  specimens?: {
    id: string;
    type: string;
    typeOther?: string;
    age?: {
      value?: number;
      unit?: string;
    };
    sex?: string;
    notes?: string;
  }[];
}
