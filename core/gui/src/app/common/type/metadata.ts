// export interface Metadata {
//   mid: number | undefined;
//   ownerUid: number | undefined;
//   name: string;
//   storagePath: string | undefined;
//   description: string;
//   creationTime: number | undefined;
// }

export interface Metadata {
  mid?: number;
  name: string;
  description: string;
  ownerUid?: number;
  storagePath?: string;
  creationTime?: string;
}
