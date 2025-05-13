import { Component } from "@angular/core";
import { UserService } from "../../../../common/service/user/user.service";
import { User } from "../../../../common/type/user";

@Component({
  selector: "texera-user-profile",
  templateUrl: "./user-profile.component.html",
  styleUrls: ["./user-profile.component.scss"]
})
export class UserProfileComponent {
  public user: User | undefined;

  constructor(
    private userService: UserService,
  ) {
    this.user = this.userService.getCurrentUser();
  }
}
