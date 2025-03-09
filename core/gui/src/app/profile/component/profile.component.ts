import { Component } from "@angular/core";
import { UserService } from "../../common/service/user/user.service";
import { User } from "../../common/type/user";

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
  ) {
    this.host_ip = "3.142.252.209";
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
