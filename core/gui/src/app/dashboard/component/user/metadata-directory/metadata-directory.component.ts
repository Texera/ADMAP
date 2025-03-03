import { UntilDestroy, untilDestroyed } from "@ngneat/until-destroy";
import { AfterViewInit, Component, ViewChild } from "@angular/core";
import { UserService } from "../../../../common/service/user/user.service";
import { Router } from "@angular/router";
import { SearchService } from "../../../service/user/search.service";
import { DatasetService } from "../../../service/user/dataset/dataset.service";
import { SortMethod } from "../../../type/sort-method";
import { DashboardEntry, UserInfo } from "../../../type/dashboard-entry";
import { SearchResultsComponent } from "../search-results/search-results.component";
import { FiltersComponent } from "../filters/filters.component";
import { firstValueFrom } from "rxjs";
import {DASHBOARD_USER_METADATA_CREATE} from "../../../../app-routing.constant";


@UntilDestroy()
@Component({
  selector: "texera-metadata-directory",
  templateUrl: "./metadata-directory.component.html",
  styleUrls: ["./metadata-directory.component.scss"]
})
export class MetadataDirectoryComponent implements AfterViewInit {
  public sortMethod = SortMethod.EditTimeDesc;
  lastSortMethod: SortMethod | null = null;
  public isLogin = this.userService.isLogin();
  public currentUid = this.userService.getCurrentUser()?.uid;

  private _filters?: FiltersComponent;
  @ViewChild(FiltersComponent) get filters(): FiltersComponent {
    if (this._filters) {
      return this._filters;
    }
    throw new Error("Property cannot be accessed before it is initialized.");
  }

  constructor(
    private userService: UserService,
    private router: Router,
  ) {
    this.userService
      .userChanged()
      .pipe(untilDestroyed(this))
      .subscribe(() => {
        this.isLogin = this.userService.isLogin();
        this.currentUid = this.userService.getCurrentUser()?.uid;
      });
  }

  ngAfterViewInit() {
    this.userService
      .userChanged()
      .pipe(untilDestroyed(this))
      .subscribe();
  }

  public onClickOpenMetadataAddComponent(): void {
    this.router.navigate([DASHBOARD_USER_METADATA_CREATE]);
  }

  // public deleteDataset(entry: DashboardEntry): void {
  //   if (entry.dataset.dataset.did == undefined) {
  //     return;
  //   }
  //   this.datasetService
  //     .deleteDatasets([entry.dataset.dataset.did])
  //     .pipe(untilDestroyed(this))
  //     .subscribe(_ => {
  //       this.searchResultsComponent.entries = this.searchResultsComponent.entries.filter(
  //         datasetEntry => datasetEntry.dataset.dataset.did !== entry.dataset.dataset.did
  //       );
  //     });
  // }
}
