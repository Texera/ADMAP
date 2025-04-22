import { Dataset, DatasetVersion } from "../../common/type/dataset";
import { DatasetFileNode } from "../../common/type/datasetVersionFileTree";

export interface DashboardDataset {
  contributors: any[];
  funders: any[];
  specimens: any[];
  isOwner: boolean;
  ownerEmail: string;
  dataset: Dataset;
  accessPrivilege: "READ" | "WRITE" | "NONE";
  size: number;
}
