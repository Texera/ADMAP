import { DatasetFileNode } from "./datasetVersionFileTree";

export interface DatasetVersion {
  dvid: number | undefined;
  did: number;
  creatorUid: number;
  name: string;
  versionHash: string | undefined;
  creationTime: number | undefined;
  fileNodes: DatasetFileNode[] | undefined;
}

// export interface Dataset {
//   did: number | undefined;
//   ownerUid: number | undefined;
//   name: string;
//   isPublic: boolean;
//   storagePath: string | undefined;
//   description: string;
//   creationTime: number | undefined;
// }

export interface Dataset {
  did: number | undefined;
  ownerUid: number | undefined;
  name: string;
  isPublic: boolean;
  storagePath: string | undefined;
  description: string;
  creationTime: number | undefined;


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

