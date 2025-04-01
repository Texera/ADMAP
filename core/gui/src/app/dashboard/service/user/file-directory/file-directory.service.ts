import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { AppSettings } from "../../../../common/app-setting";

export const DIRECTORY_BASE_URL = "directory";

@Injectable({
  providedIn: "root",
})
export class FileDirectoryService {
  constructor(private http: HttpClient) {}

  public readonly host_ip = '13.59.243.53';
  public fetchDirectories(): Observable<string> {
    return this.http.get(`${AppSettings.getApiEndpoint()}/${DIRECTORY_BASE_URL}`, { responseType: "text" });
  }
}
