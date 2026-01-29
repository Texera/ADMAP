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

import { Component, OnInit } from "@angular/core";
import { firstValueFrom, forkJoin } from "rxjs";
import { ActionType, EntityType, HubService } from "../../service/hub.service";
import { UntilDestroy, untilDestroyed } from "@ngneat/until-destroy";
import { Router } from "@angular/router";
import { SearchService } from "../../../dashboard/service/user/search.service";
import { DashboardEntry } from "../../../dashboard/type/dashboard-entry";
import {
  DASHBOARD_HOME,
  DASHBOARD_HUB_DATASET_RESULT,
  DASHBOARD_HUB_WORKFLOW_RESULT,
  DASHBOARD_ABOUT,
} from "../../../app-routing.constant";
import { UserService } from "../../../common/service/user/user.service";
import { AdminSettingsService } from "../../../dashboard/service/admin/settings/admin-settings.service";

@UntilDestroy()
@Component({
  selector: "texera-landing-page",
  templateUrl: "./landing-page.component.html",
  styleUrls: ["./landing-page.component.scss"],
})
export class LandingPageComponent implements OnInit {
  public isLogin = this.userService.isLogin();
  public currentUid = this.userService.getCurrentUser()?.uid;
  public workflowCount: number = 0;
  public datasetCount: number = 0;
  public topLovedWorkflows: DashboardEntry[] = [];
  public topClonedWorkflows: DashboardEntry[] = [];
  public topLovedDatasets: DashboardEntry[] = [];

  public wholeBrainDatasetIds: number[] = [];
  public u24DatasetIds: number[] = [];
  public merfishDatasetIds: number[] = [];
  public mriDatasetIds: number[] = [];

  constructor(
    private hubService: HubService,
    private router: Router,
    private searchService: SearchService,
    private userService: UserService,
    private adminSettingsService: AdminSettingsService
  ) {
    this.userService
      .userChanged()
      .pipe(untilDestroyed(this))
      .subscribe(() => {
        this.isLogin = this.userService.isLogin();
        this.currentUid = this.userService.getCurrentUser()?.uid;
      });
  }

  ngOnInit(): void {
    this.getWorkflowCount();
    this.loadTops();
    this.loadShowcaseDataset();
  }

  async loadTops() {
    try {
      const [workflowEntries, datasetEntries] = await Promise.all([
        this.getTopLovedEntries(EntityType.Workflow, [ActionType.Like, ActionType.Clone]),
        this.getTopLovedEntries(EntityType.Dataset, [ActionType.Like]),
      ]);

      this.topLovedWorkflows = workflowEntries["like"] || [];
      this.topClonedWorkflows = workflowEntries["clone"] || [];
      this.topLovedDatasets = datasetEntries["like"] || [];
    } catch (error) {
      console.error("Failed to load top entries:", error);
    }
  }

  getWorkflowCount(): void {
    this.hubService
      .getCount(EntityType.Workflow)
      .pipe(untilDestroyed(this))
      .subscribe((count: number) => {
        this.workflowCount = count;
      });
    this.hubService
      .getCount(EntityType.Dataset)
      .pipe(untilDestroyed(this))
      .subscribe((count: number) => {
        this.datasetCount = count;
      });
  }

  public async getTopLovedEntries(
    entityType: EntityType,
    actionTypes: ActionType[]
  ): Promise<{ [actionType: string]: DashboardEntry[] }> {
    const topsMap = await firstValueFrom(this.hubService.getTops(entityType, actionTypes, this.currentUid));

    const result: { [key: string]: DashboardEntry[] } = {};
    for (const act of actionTypes) {
      const items = topsMap[act] || [];
      result[act] = await firstValueFrom(
        this.searchService.extendSearchResultsWithHubActivityInfo(items, true, ["access"])
      );
    }
    return result;
  }

  navigateToSearch(type: string): void {
    let path: string;

    switch (type) {
      case "workflow":
        path = DASHBOARD_HUB_WORKFLOW_RESULT;
        break;
      case "dataset":
        path = DASHBOARD_HUB_DATASET_RESULT;
        break;
      case "about":
        path = DASHBOARD_ABOUT;
        break;
      default:
        path = DASHBOARD_HOME;
    }

    this.router.navigate([path]);
  }

  private parseIds(value: string | null): number[] {
    if (!value?.trim()) return [];
    return value
      .split(",")
      .map(id => parseInt(id.trim()))
      .filter(id => !isNaN(id) && id > 0);
  }

  private loadShowcaseDataset(): void {
    forkJoin({
      wholeBrain: this.adminSettingsService.getSetting("whole_brain_imaging_dataset_ids"),
      u24: this.adminSettingsService.getSetting("u24_dataset_ids"),
      merfish: this.adminSettingsService.getSetting("merfish_dataset_ids"),
      mri: this.adminSettingsService.getSetting("mri_dataset_ids"),
    })
      .pipe(untilDestroyed(this))
      .subscribe(res => {
        this.wholeBrainDatasetIds = this.parseIds(res.wholeBrain);
        this.u24DatasetIds = this.parseIds(res.u24);
        this.merfishDatasetIds = this.parseIds(res.merfish);
        this.mriDatasetIds = this.parseIds(res.mri);
      });
  }
}
