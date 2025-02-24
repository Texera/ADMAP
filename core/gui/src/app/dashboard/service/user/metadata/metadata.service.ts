import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { map } from "rxjs/operators";
import { Metadata } from "../../../../common/type/metadata";
import { AppSettings } from "../../../../common/app-setting";
import { Observable } from "rxjs";
import { DashboardDataset } from "../../../type/dashboard-dataset.interface";
import { FileUploadItem } from "../../../type/dashboard-file.interface";
import { DatasetFileNode } from "../../../../common/type/datasetVersionFileTree";

export const METADATA_BASE_URL = "metadata";
export const  METADATA_CREATE_URL = METADATA_BASE_URL + "/create";
// export const  METADATA_UPDATE_BASE_URL = METADATA_BASE_URL + "/update";
// export const METADATA_UPDATE_NAME_URL = METADATA_UPDATE_BASE_URL + "/name";
// export const METADATA_UPDATE_DESCRIPTION_URL = METADATA_UPDATE_NAME_URL + "/description";
// export const METADATA_UPDATE_PUBLICITY_URL = "update/publicity";
// export const METADATA_LIST_URL = METADATA_BASE_URL + "/list";
// export const METADATA_SEARCH_URL = METADATA_BASE_URL + "/search";
// export const METADATA_DELETE_URL = METADATA_BASE_URL + "/delete";

export const DEFAULT_METADATA_NAME = "Untitled metadata";
export const METADATA_GET_OWNERS_URL = METADATA_BASE_URL + "/metadataUserAccess";

@Injectable({
  providedIn: "root",
})
export class MetadataService {
  constructor(private http: HttpClient) {}

  public createMetadata(
    metadata: { name: string; description: any },
  ): Observable<DashboardDataset> {
    const formData = new FormData();
    formData.append("metadataName", metadata.name);
    formData.append("metadataDescription", metadata.description);

    return this.http.post<DashboardDataset>(`${AppSettings.getApiEndpoint()}/${METADATA_CREATE_URL}`, formData);
  }

  public getMetadata(did: number, isLogin: boolean = true): Observable<DashboardDataset> {
    const apiUrl = isLogin
      ? `${AppSettings.getApiEndpoint()}/${METADATA_BASE_URL}/${did}`
      : `${AppSettings.getApiEndpoint()}/${METADATA_BASE_URL}/public/${did}`;
    return this.http.get<DashboardDataset>(apiUrl);
  }

  /**
   * Retrieves a zip file of a dataset or a specific path within a dataset.
   * @param options An object containing optional parameters:
   *   - path: A string representing a specific file or directory path within the dataset
   *   - did: A number representing the dataset ID
   * @returns An Observable that emits a Blob containing the zip file
   */
  public retrieveDatasetZip(options: { did: number; dvid?: number }): Observable<Blob> {
    let params = new HttpParams();
    params = params.set("did", options.did.toString());
    if (options.dvid) {
      params = params.set("dvid", options.dvid.toString());
    }

    return this.http.get(`${AppSettings.getApiEndpoint()}/${METADATA_BASE_URL}/version-zip`, {
      params,
      responseType: "blob",
    });
  }

  public retrieveAccessibleDatasets(): Observable<DashboardDataset[]> {
    return this.http.get<DashboardDataset[]>(`${AppSettings.getApiEndpoint()}/${METADATA_BASE_URL}`);
  }


  // public deleteDatasets(dids: number[]): Observable<Response> {
  //   return this.http.post<Response>(`${AppSettings.getApiEndpoint()}/${METADATA_BASE_URL}`, {
  //     dids: dids,
  //   });
  // }
  //
  // public updateDatasetName(did: number, name: string): Observable<Response> {
  //   return this.http.post<Response>(`${AppSettings.getApiEndpoint()}/${DATASET_UPDATE_NAME_URL}`, {
  //     did: did,
  //     name: name,
  //   });
  // }
  //
  // public updateDatasetDescription(did: number, description: string): Observable<Response> {
  //   return this.http.post<Response>(`${AppSettings.getApiEndpoint()}/${DATASET_UPDATE_DESCRIPTION_URL}`, {
  //     did: did,
  //     description: description,
  //   });
  // }
  //
  // public getDatasetOwners(did: number): Observable<number[]> {
  //   return this.http.get<number[]>(`${AppSettings.getApiEndpoint()}/${DATASET_GET_OWNERS_URL}?did=${did}`);
  // }
}
