import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { AppSettings } from "../../../../common/app-setting";
import { Observable } from "rxjs";

export const METADATA_BASE_URL = "metadata";
export const METADATA_CREATE_URL = METADATA_BASE_URL + "/create";
export const METADATA_GET_URL = METADATA_BASE_URL + "";

@Injectable({
  providedIn: "root",
})
export class MetadataService {
  constructor(private http: HttpClient) {}

  public createMetadata(metadata: any): Observable<any> {
    return this.http.post<any>(`${AppSettings.getApiEndpoint()}/${METADATA_CREATE_URL}`, metadata);
  }

  public getMetadata(): Observable<any> {
    return this.http.get<any>(`${AppSettings.getApiEndpoint()}/${METADATA_GET_URL}`);
  }
}
