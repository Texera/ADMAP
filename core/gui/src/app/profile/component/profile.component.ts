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
  public showPassword: boolean = false;

  constructor(
    private userService: UserService,
  ) {
    this.user = this.userService.getCurrentUser();
  }
}
