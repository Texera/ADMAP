import { Component } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { UntilDestroy, untilDestroyed } from "@ngneat/until-destroy";
import { NzResizeEvent } from "ng-zorro-antd/resizable";
import { DownloadService } from "../../../../service/user/download/download.service";
import { formatSize } from "src/app/common/util/size-formatter.util";
import { UserService } from "../../../../../common/service/user/user.service";

@UntilDestroy()
@Component({
  templateUrl: "./metadata-detail.component.html",
  styleUrls: ["./metadata-detail.component.scss"],
})
export class MetadataDetailComponent {
  public mid: number | undefined;
  public metadataName: string = "";
  public metadataDescription: string = "";
  public metadataCreationTime: string = "";
  public userMetadataAccessLevel: "READ" | "WRITE" | "NONE" = "NONE";

  public currentDisplayedFileName: string = "";
  public currentFileSize: number | undefined;
  public currentMetadataSize: number | undefined;

  public isRightBarCollapsed = false;
  public isMaximized = false;

  public isCreatingMetadata: boolean = true;
  public isLogin: boolean = this.userService.isLogin();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    // private metadataService: MetadataService,
    private downloadService: DownloadService,
    private userService: UserService
  ) {
    this.userService
      .userChanged()
      .pipe(untilDestroyed(this))
      .subscribe(() => {
        this.isLogin = this.userService.isLogin();
      });
  }

  // item for control the resizeable sider
  MAX_SIDER_WIDTH = 600;
  MIN_SIDER_WIDTH = 150;
  siderWidth = 200;
  id = -1;
  onSideResize({ width }: NzResizeEvent): void {
    cancelAnimationFrame(this.id);
    this.id = requestAnimationFrame(() => {
      this.siderWidth = width!;
    });
  }

  renderMetadataViewSider() {
    this.isCreatingMetadata = false;
  }

  renderMetadataCreatorSider() {
    this.isCreatingMetadata = true;
    this.siderWidth = this.MAX_SIDER_WIDTH;
  }

  public onCreationFinished(creationID: number) {
    console.log("CREATED A METADATA: ", creationID);
    // if (creationID != 0) {
    //   // creation succeed
    //   this.router.navigate([`${DASHBOARD_USER_METADATA_DIRECTORY}/${creationID}`]);
    // } else {
    //   // creation failed
    //   this.router.navigate([DASHBOARD_USER_METADATA_DIRECTORY]);
    // }
  }

  retrieveMetadataInfo() {
    // if (this.mid) {
    //   this.metadataService
    //     .getMetadata(this.mid, this.isLogin)
    //     .pipe(untilDestroyed(this))
    //     .subscribe(dashboardMetadata => {
    //       const metadata = dashboardMetadata.metadata;
    //       this.metadataName = metadata.name;
    //       this.metadataDescription = metadata.description;
    //       this.userMetadataAccessLevel = dashboardMetadata.accessPrivilege;
    //       this.metadataIsPublic = metadata.isPublic === 1;
    //       if (typeof metadata.creationTime === "number") {
    //         this.metadataCreationTime = new Date(metadata.creationTime).toString();
    //       }
    //       this.retrieveMetadataFileTree();
    //     });
    // }
  }

  // loadFileContent(node: MetadataFileNode) {
  //   this.currentDisplayedFileName = getFullPathFromMetadataFileNode(node);
  //   this.currentFileSize = node.size;
  // }

  onClickDownloadCurrentFile = (): void => {
    if (!this.mid) return;

    this.downloadService.downloadSingleFile(this.currentDisplayedFileName).pipe(untilDestroyed(this)).subscribe();
  };

  // onClickDownloadMetadataAsZip = (): void => {
  //   if (!this.mid) return;
  //
  //   this.downloadService
  //     .downloadMetadata(this.mid, this.metadataName)
  //     .pipe(untilDestroyed(this))
  //     .subscribe();
  // };

  isDisplayingMetadata(): boolean {
    return !this.isCreatingMetadata;
  }

  userHasWriteAccess(): boolean {
    return this.userMetadataAccessLevel == "WRITE";
  }

  // alias for formatSize
  formatSize = formatSize;
}
