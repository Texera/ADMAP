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
  private host_ip: string;

  constructor(
    private userService: UserService,
  ) {
    this.host_ip = "3.145.57.82";
    this.user = this.userService.getCurrentUser();

    if (this.user) {
      this.scpUsername = `${this.user.email.split("@")[0]}_${this.user.uid}`;
      // TODO get password
      // this.scpPassword = this.user.email
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
}
