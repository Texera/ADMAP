import {Component, OnInit} from "@angular/core";
import { FileDirectoryService } from "../../../service/user/file-directory/file-directory.service";
import {UserService} from "../../../../common/service/user/user.service";
import {User} from "../../../../common/type/user";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";

@Component({
  selector: "texera-file-directory",
  templateUrl: "./file-directory.component.html",
  styleUrls: ["./file-directory.component.css"]
})
export class FileDirectoryComponent implements OnInit {
    directoryHtml: string = "";
    public user: User | undefined;
    public scpUsername : string | undefined;
    public scpPassword: string | undefined;
    public showPassword: boolean = false;
    public host_ip: SafeResourceUrl | undefined;

  constructor(
    private fileDirectoryService: FileDirectoryService,
    private sanitizer: DomSanitizer
  ) {
  }

ngOnInit(): void {
  const hostIp = this.fileDirectoryService.host_ip;
  const hostIpWithPort = hostIp.startsWith("http") ? hostIp : `http://${hostIp}:80`;

  if (hostIpWithPort) {
    this.host_ip = this.sanitizer.bypassSecurityTrustResourceUrl(hostIpWithPort);
  }
}
}
