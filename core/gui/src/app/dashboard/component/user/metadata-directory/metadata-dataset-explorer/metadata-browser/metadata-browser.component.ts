import { Component, OnInit } from "@angular/core";
import { MetadataService } from "../../../../../service/user/metadata/metadata.service";
import { UntilDestroy } from "@ngneat/until-destroy";
import { NotificationService } from "../../../../../../common/service/notification/notification.service";
import { Router } from "@angular/router";

@UntilDestroy()
@Component({
  selector: "texera-metadata-browser",
  templateUrl: "./metadata-browser.component.html",
  styleUrls: ["./metadata-browser.component.scss"],
})
export class MetadataBrowserComponent implements OnInit {
  public metadataList: any[] = [];
  public selectedMetadata: any = null;

  constructor(
    private metadataService: MetadataService,
    private notificationService: NotificationService,
  ) {}

  ngOnInit() {
    this.metadataService.getMetadata().subscribe(
      (data) => {
        this.metadataList = data;
      },
      (error) => {
        console.error("Error fetching metadata:", error);
        this.notificationService.error("Failed to fetch metadata", error);
      }
    );
  }

  openMetadataDetail(metadata: any): void {
    this.selectedMetadata = metadata;
  }

  closeModal(): void {
    this.selectedMetadata = null;
  }
}
