import { Component } from "@angular/core";
import { UserService } from "../../common/service/user/user.service";
import { User } from "../../common/type/user";
import { FileDirectoryService } from "../../dashboard/service/user/file-directory/file-directory.service";

@Component({
  selector: "texera-profile",
  templateUrl: "./profile.component.html",
  styleUrls: ["./profile.component.scss"]
})
export class ProfileComponent {
  public user: User | undefined;
  public scpUsername : string | undefined;
  public scpPassword: string | undefined;
  public showPassword: boolean = false;
  public host_ip: string;

  constructor(
    private userService: UserService,
    private fileDirectoryService: FileDirectoryService
  ) {
    this.host_ip = this.fileDirectoryService.host_ip;
    this.user = this.userService.getCurrentUser();

    if (this.user) {
      this.scpUsername = `${this.user.email.split("@")[0]}_${this.user.uid}`;

      this.userService.getCurrentUserPassword().subscribe(
        password => {
          console.log('Password fetched:', password); // Log the password
          this.scpPassword = password;
        },
        error => {
          console.error('Error fetching password:', error);
        }
      );
    }


  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
}
