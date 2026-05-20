/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from "@angular/core";
import { UntilDestroy, untilDestroyed } from "@ngneat/until-destroy";
import { NgIf } from "@angular/common";
import { RouterLink } from "@angular/router";
import { NzCardComponent } from "ng-zorro-antd/card";
import { NzIconDirective } from "ng-zorro-antd/icon";
import { NzButtonComponent } from "ng-zorro-antd/button";
import { NzWaveDirective } from "ng-zorro-antd/core/wave";
import { NzPopconfirmDirective } from "ng-zorro-antd/popconfirm";
import { NzTooltipModule } from "ng-zorro-antd/tooltip";
import { NzDropdownDirective, NzDropdownMenuComponent } from "ng-zorro-antd/dropdown";
import { NzMenuDirective, NzMenuItemComponent } from "ng-zorro-antd/menu";
import { firstValueFrom } from "rxjs";
import { DashboardEntry } from "../../../../type/dashboard-entry";
import { UserAvatarComponent } from "../../user-avatar/user-avatar.component";
import { ShareAccessComponent } from "../../share-access/share-access.component";
import { DatasetService } from "../../../../service/user/dataset/dataset.service";
import { DownloadService } from "../../../../service/user/download/download.service";
import { ActionType, HubService } from "../../../../../hub/service/hub.service";
import { NzModalRef, NzModalService } from "ng-zorro-antd/modal";
import { AppSettings } from "../../../../../common/app-setting";
import { formatSize } from "../../../../../common/util/size-formatter.util";
import { isDefined } from "../../../../../common/util/predicate";
import { DASHBOARD_HUB_DATASET_RESULT_DETAIL, DASHBOARD_USER_DATASET } from "../../../../../app-routing.constant";

@UntilDestroy()
@Component({
  selector: "texera-dataset-card-item",
  templateUrl: "./user-dataset-card-item.component.html",
  styleUrls: ["./user-dataset-card-item.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgIf,
    RouterLink,
    NzCardComponent,
    NzIconDirective,
    NzButtonComponent,
    NzWaveDirective,
    NzPopconfirmDirective,
    NzTooltipModule,
    NzDropdownDirective,
    NzDropdownMenuComponent,
    NzMenuDirective,
    NzMenuItemComponent,
    UserAvatarComponent,
  ],
})
export class UserDatasetCardItemComponent implements OnChanges {
  @Input() editable = false;
  @Input() currentUid: number | undefined;
  @Output() deleted = new EventEmitter<void>();
  @Output() refresh = new EventEmitter<void>();

  private _entry?: DashboardEntry;
  @Input()
  get entry(): DashboardEntry {
    if (!this._entry) {
      throw new Error("entry property must be provided.");
    }
    return this._entry;
  }
  set entry(value: DashboardEntry) {
    this._entry = value;
  }

  entryLink: string[] = [];
  coverImageSrc: string = "";
  readonly defaultCover = "../../../../../../assets/card_background.jpg";
  likeCount = 0;
  viewCount = 0;
  isLiked = false;

  constructor(
    private modalService: NzModalService,
    private datasetService: DatasetService,
    private downloadService: DownloadService,
    private hubService: HubService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["entry"]) {
      this.initializeEntry();
      this.likeCount = this.entry.likeCount ?? 0;
      this.viewCount = this.entry.viewCount ?? 0;
      this.isLiked = this.entry.isLiked ?? false;
    }
  }

  private initializeEntry(): void {
    if (this.entry.type !== "dataset" || typeof this.entry.id !== "number") {
      return;
    }
    const owners = this.entry.accessibleUserIds;
    if (this.currentUid !== undefined && owners.includes(this.currentUid)) {
      this.entryLink = [DASHBOARD_USER_DATASET, String(this.entry.id)];
    } else {
      this.entryLink = [DASHBOARD_HUB_DATASET_RESULT_DETAIL, String(this.entry.id)];
    }
    this.coverImageSrc = this.entry.coverImageUrl
      ? `${AppSettings.getApiEndpoint()}/dataset/${this.entry.id}/cover`
      : this.defaultCover;
  }

  onCoverError(event: Event): void {
    (event.target as HTMLImageElement).src = this.defaultCover;
  }

  public async onClickOpenShareAccess(): Promise<void> {
    const modal: NzModalRef<ShareAccessComponent> = this.modalService.create({
      nzContent: ShareAccessComponent,
      nzData: {
        writeAccess: this.entry.accessLevel === "WRITE",
        type: "dataset",
        id: this.entry.id,
        allOwners: await firstValueFrom(this.datasetService.retrieveOwners()),
      },
      nzFooter: null,
      nzTitle: "Share this dataset with others",
      nzCentered: true,
      nzWidth: "700px",
    });
    modal.componentInstance?.refresh.pipe(untilDestroyed(this)).subscribe(() => this.refresh.emit());
  }

  public onClickDownload = (): void => {
    if (!this.entry.id) return;
    this.downloadService.downloadDataset(this.entry.id, this.entry.name).pipe(untilDestroyed(this)).subscribe();
  };

  toggleLike(): void {
    if (!isDefined(this.currentUid) || !isDefined(this.entry.id)) return;
    const entryId = this.entry.id;
    const refreshCount = () => {
      this.hubService
        .getCounts([this.entry.type], [entryId], [ActionType.Like])
        .pipe(untilDestroyed(this))
        .subscribe(counts => {
          this.likeCount = counts[0]?.counts.like ?? 0;
          this.cdr.markForCheck();
        });
    };

    if (this.isLiked) {
      this.hubService
        .postUnlike(entryId, this.entry.type)
        .pipe(untilDestroyed(this))
        .subscribe(success => {
          if (success) {
            this.isLiked = false;
            this.cdr.markForCheck();
            refreshCount();
          }
        });
    } else {
      this.hubService
        .postLike(entryId, this.entry.type)
        .pipe(untilDestroyed(this))
        .subscribe(success => {
          if (success) {
            this.isLiked = true;
            this.cdr.markForCheck();
            refreshCount();
          }
        });
    }
  }

  get canDelete(): boolean {
    return this.entry.type === "dataset" && this.entry.dataset.isOwner;
  }

  private static readonly VISUALIZATION_LABELS: Record<string, { short: string; long: string }> = {
    merfisheyes_single_cell: { short: "MERFISH viewer", long: "MERFISHEYES Single Cell" },
    merfisheyes_single_molecule: { short: "MERFISH viewer", long: "MERFISHEYES Single Molecule" },
    aav_gallery: { short: "Image gallery", long: "AAV Gallery" },
  };

  private get visualizationLabels(): { short: string; long: string } | null {
    if (this.entry.type !== "dataset") return null;
    const type = this.entry.dataset.dataset.visualizationType;
    if (!type || type === "none") return null;
    return UserDatasetCardItemComponent.VISUALIZATION_LABELS[type] ?? { short: type, long: type };
  }

  get visualizationLabel(): string | null {
    return this.visualizationLabels?.short ?? null;
  }

  get visualizationLabelLong(): string | null {
    return this.visualizationLabels?.long ?? null;
  }

  formatSize = formatSize;

  formatCount(count: number): string {
    if (count >= 1000) return (count / 1000).toFixed(1) + "k";
    return String(count);
  }

  formatRelativeTime(timestamp: number | undefined): string {
    if (timestamp === undefined) return "Unknown";
    const diff = Date.now() - timestamp;
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    const w = Math.floor(d / 7);
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    if (d < 7) return `${d}d ago`;
    if (w < 4) return `${w}w ago`;
    return new Date(timestamp).toLocaleDateString();
  }
}
