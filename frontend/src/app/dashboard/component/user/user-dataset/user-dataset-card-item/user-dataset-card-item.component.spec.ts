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

import { ComponentFixture, TestBed } from "@angular/core/testing";
import { NO_ERRORS_SCHEMA } from "@angular/core";
import { HttpClientTestingModule } from "@angular/common/http/testing";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { RouterTestingModule } from "@angular/router/testing";
import { NzModalService } from "ng-zorro-antd/modal";
import { of } from "rxjs";
import type { Mocked } from "vitest";

import { UserDatasetCardItemComponent } from "./user-dataset-card-item.component";
import { DashboardEntry } from "src/app/dashboard/type/dashboard-entry";
import { DatasetService } from "../../../../service/user/dataset/dataset.service";
import { DownloadService } from "../../../../service/user/download/download.service";
import { ActionType, HubService } from "../../../../../hub/service/hub.service";
import { UserService } from "../../../../../common/service/user/user.service";
import { StubUserService } from "../../../../../common/service/user/stub-user.service";
import { AppSettings } from "../../../../../common/app-setting";
import { HUB_DATASET_RESULT_DETAIL, USER_DATASET } from "../../../../../app-routing.constant";
import { commonTestProviders } from "../../../../../common/testing/test-utils";

function makeDatasetEntry(overrides: Partial<any> = {}): DashboardEntry {
  return {
    type: "dataset",
    id: 42,
    name: "Test Dataset",
    description: "",
    creationTime: Date.now() - 86400000,
    lastModifiedTime: Date.now() - 3600000,
    accessLevel: "WRITE",
    ownerName: "Alice",
    ownerEmail: "alice@example.com",
    ownerGoogleAvatar: "",
    ownerId: 1,
    size: 2_621_440, // 2.5 MB
    viewCount: 21,
    likeCount: 5,
    isLiked: false,
    accessibleUserIds: [1, 2],
    coverImageUrl: undefined,
    dataset: {
      isOwner: true,
      ownerEmail: "alice@example.com",
      accessPrivilege: "WRITE",
      size: 2_621_440,
      contributors: [],
      dataset: {
        did: 42,
        ownerUid: 1,
        name: "Test Dataset",
        isPublic: true,
        isDownloadable: true,
        storagePath: "",
        description: "",
        creationTime: Date.now() - 86400000,
        coverImage: undefined,
        visualizationType: "none",
      },
    },
    ...overrides,
  } as unknown as DashboardEntry;
}

describe("UserDatasetCardItemComponent", () => {
  let component: UserDatasetCardItemComponent;
  let fixture: ComponentFixture<UserDatasetCardItemComponent>;
  let hubService: Mocked<HubService>;

  beforeEach(async () => {
    const datasetServiceSpy = { retrieveOwners: vi.fn().mockReturnValue(of([])) };
    const downloadServiceSpy = { downloadDataset: vi.fn().mockReturnValue(of(new Blob())) };
    const hubServiceSpy = {
      postLike: vi.fn().mockReturnValue(of(true)),
      postUnlike: vi.fn().mockReturnValue(of(true)),
      getCounts: vi.fn().mockReturnValue(of([{ counts: { like: 7 } }])),
    };

    await TestBed.configureTestingModule({
      imports: [UserDatasetCardItemComponent, HttpClientTestingModule, BrowserAnimationsModule, RouterTestingModule],
      providers: [
        { provide: DatasetService, useValue: datasetServiceSpy },
        { provide: DownloadService, useValue: downloadServiceSpy },
        { provide: HubService, useValue: hubServiceSpy },
        { provide: UserService, useClass: StubUserService },
        NzModalService,
        ...commonTestProviders,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(UserDatasetCardItemComponent);
    component = fixture.componentInstance;
    hubService = TestBed.inject(HubService) as unknown as Mocked<HubService>;
  });

  describe("visualizationLabel", () => {
    it("returns short + long label for merfisheyes_single_cell", () => {
      component.entry = makeDatasetEntry({
        dataset: {
          ...makeDatasetEntry().dataset,
          dataset: { ...makeDatasetEntry().dataset.dataset, visualizationType: "merfisheyes_single_cell" },
        },
      });
      component.ngOnChanges({ entry: { currentValue: component.entry } } as any);
      expect(component.visualizationLabel).toBe("MERFISH viewer");
      expect(component.visualizationLabelLong).toBe("MERFISHEYES Single Cell");
    });

    it("returns short + long label for aav_gallery", () => {
      component.entry = makeDatasetEntry({
        dataset: {
          ...makeDatasetEntry().dataset,
          dataset: { ...makeDatasetEntry().dataset.dataset, visualizationType: "aav_gallery" },
        },
      });
      component.ngOnChanges({ entry: { currentValue: component.entry } } as any);
      expect(component.visualizationLabel).toBe("Image gallery");
      expect(component.visualizationLabelLong).toBe("AAV Gallery");
    });

    it("returns null when visualizationType is 'none'", () => {
      component.entry = makeDatasetEntry();
      component.ngOnChanges({ entry: { currentValue: component.entry } } as any);
      expect(component.visualizationLabel).toBeNull();
      expect(component.visualizationLabelLong).toBeNull();
    });

    it("returns null when visualizationType is undefined", () => {
      const entry = makeDatasetEntry();
      (entry as any).dataset.dataset.visualizationType = undefined;
      component.entry = entry;
      component.ngOnChanges({ entry: { currentValue: entry } } as any);
      expect(component.visualizationLabel).toBeNull();
    });
  });

  describe("entryLink", () => {
    it("routes to user dataset page when currentUid is in accessibleUserIds", () => {
      component.currentUid = 1;
      component.entry = makeDatasetEntry({ id: 99, accessibleUserIds: [1, 2] });
      component.ngOnChanges({ entry: { currentValue: component.entry } } as any);
      expect(component.entryLink).toEqual([USER_DATASET, "99"]);
    });

    it("routes to hub detail page when currentUid is not in accessibleUserIds", () => {
      component.currentUid = 5;
      component.entry = makeDatasetEntry({ id: 99, accessibleUserIds: [1, 2] });
      component.ngOnChanges({ entry: { currentValue: component.entry } } as any);
      expect(component.entryLink).toEqual([HUB_DATASET_RESULT_DETAIL, "99"]);
    });

    it("routes to hub detail page when currentUid is undefined", () => {
      component.currentUid = undefined;
      component.entry = makeDatasetEntry({ id: 99, accessibleUserIds: [1, 2] });
      component.ngOnChanges({ entry: { currentValue: component.entry } } as any);
      expect(component.entryLink).toEqual([HUB_DATASET_RESULT_DETAIL, "99"]);
    });
  });

  describe("coverImageSrc", () => {
    it("uses default cover when coverImageUrl is undefined", () => {
      component.entry = makeDatasetEntry({ coverImageUrl: undefined });
      component.ngOnChanges({ entry: { currentValue: component.entry } } as any);
      expect(component.coverImageSrc).toBe(component.defaultCover);
    });

    it("builds API URL when coverImageUrl is set", () => {
      component.entry = makeDatasetEntry({ id: 7, coverImageUrl: "v1/img.png" });
      component.ngOnChanges({ entry: { currentValue: component.entry } } as any);
      expect(component.coverImageSrc).toBe(`${AppSettings.getApiEndpoint()}/dataset/7/cover`);
    });
  });

  describe("formatCount", () => {
    it("renders raw count under 1000", () => {
      expect(component.formatCount(0)).toBe("0");
      expect(component.formatCount(999)).toBe("999");
    });

    it("abbreviates thousands as Xk", () => {
      expect(component.formatCount(1000)).toBe("1.0k");
      expect(component.formatCount(2500)).toBe("2.5k");
      expect(component.formatCount(15234)).toBe("15.2k");
    });
  });

  describe("formatRelativeTime", () => {
    const NOW = 1_700_000_000_000;
    beforeEach(() => vi.setSystemTime(NOW));
    afterEach(() => vi.useRealTimers());

    it("formats minutes", () => {
      expect(component.formatRelativeTime(NOW - 30 * 60_000)).toBe("30m ago");
    });

    it("formats hours", () => {
      expect(component.formatRelativeTime(NOW - 5 * 3600_000)).toBe("5h ago");
    });

    it("formats days", () => {
      expect(component.formatRelativeTime(NOW - 3 * 86400_000)).toBe("3d ago");
    });

    it("formats weeks", () => {
      expect(component.formatRelativeTime(NOW - 2 * 7 * 86400_000)).toBe("2w ago");
    });

    it("falls back to absolute date past 4 weeks", () => {
      const result = component.formatRelativeTime(NOW - 60 * 86400_000);
      expect(result).not.toMatch(/ago$/);
    });

    it("returns 'Unknown' for undefined", () => {
      expect(component.formatRelativeTime(undefined)).toBe("Unknown");
    });
  });

  describe("toggleLike", () => {
    beforeEach(() => {
      component.currentUid = 1;
      component.entry = makeDatasetEntry();
      component.ngOnChanges({ entry: { currentValue: component.entry } } as any);
    });

    it("does nothing when user is not logged in", () => {
      component.currentUid = undefined;
      component.toggleLike();
      expect(hubService.postLike).not.toHaveBeenCalled();
      expect(hubService.postUnlike).not.toHaveBeenCalled();
    });

    it("calls postLike and updates isLiked when not liked", () => {
      component.isLiked = false;
      component.toggleLike();
      expect(hubService.postLike).toHaveBeenCalledWith(42, "dataset");
      expect(component.isLiked).toBe(true);
      expect(hubService.getCounts).toHaveBeenCalledWith(["dataset"], [42], [ActionType.Like]);
      expect(component.likeCount).toBe(7);
    });

    it("calls postUnlike and updates isLiked when already liked", () => {
      component.isLiked = true;
      component.toggleLike();
      expect(hubService.postUnlike).toHaveBeenCalledWith(42, "dataset");
      expect(component.isLiked).toBe(false);
      expect(component.likeCount).toBe(7);
    });
  });
});
