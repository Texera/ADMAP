import {Component, OnInit} from "@angular/core";
import { FileDirectoryService } from "../../../service/user/file-directory/file-directory.service";
import {UserService} from "../../../../common/service/user/user.service";
import {User} from "../../../../common/type/user";

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

  constructor(
    private userService: UserService,
    private fileDirectoryService: FileDirectoryService
  ) {
    this.user = this.userService.getCurrentUser();

    if (this.user) {
      // this.scpUsername = this.userService.getSCPUsername();
      this.scpUsername = this.userService.getSCPUsername();
      this.scpPassword = this.userService.getSCPPassword();
    }
  }

ngOnInit(): void {
    this.fileDirectoryService.fetchDirectories().subscribe(
        (data: string) => {
            this.directoryHtml = data;
        },
        (error) => {
            console.error("Error fetching directory:", error);
        }
    );
}
}
