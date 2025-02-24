import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { FormlyFieldConfig } from "@ngx-formly/core";
import { MetadataService } from "../../../../../service/user/metadata/metadata.service";
import { FileUploadItem } from "../../../../../type/dashboard-file.interface";
import { UntilDestroy, untilDestroyed } from "@ngneat/until-destroy";
import { NotificationService } from "../../../../../../common/service/notification/notification.service";
import sanitize from "sanitize-filename";
import { HttpErrorResponse } from "@angular/common/http";
import { Router } from "@angular/router";
import {DASHBOARD_USER_METADATA_DIRECTORY} from "../../../../../../app-routing.constant";


@UntilDestroy()
@Component({
  selector: "texera-metadata-creator",
  templateUrl: "./metadata-creator.component.html",
  styleUrls: ["./metadata-creator.component.scss"],
})
export class MetadataCreatorComponent implements OnInit {
  @Input()
  isCreatingMetadata: boolean = false;

  // this emits the ID of the newly created metadata, will emit 0 if creation is failed.
  @Output()
  metadataCreationID: EventEmitter<number> = new EventEmitter<number>();

  isCreateButtonDisabled: boolean = false;

  newUploadFiles: FileUploadItem[] = [];

  removedFilePaths: string[] = [];

  public form: FormGroup = new FormGroup({});
  model: any = {};
  fields: FormlyFieldConfig[] = [];
  isMetadataPublic: boolean = false;

  // used when creating the metadata
  isMetadataNameSanitized: boolean = false;

  // boolean to control if is uploading
  isUploading: boolean = false;

  constructor(
    private router: Router,
    private metadataService: MetadataService,
    private notificationService: NotificationService,
    private formBuilder: FormBuilder
  ) {}

  ngOnInit() {
    this.setFormFields();
    this.isMetadataNameSanitized = false;
  }

  private setFormFields() {
    this.fields = [
      {
        key: "name",
        type: "input",
        templateOptions: {
          label: "Name",
          required: true,
        },
      },
      {
        key: "description",
        type: "input",
        defaultValue: "",
        templateOptions: {
          label: "Description",
        },
      },
    ];
  }

  get formControlNames(): string[] {
    return Object.keys(this.form.controls);
  }

  metadataNameSanitization(metadataName: string): string {
    const sanitizedMetadataName = sanitize(metadataName);
    if (sanitizedMetadataName != metadataName) {
      this.isMetadataNameSanitized = true;
    }
    return sanitizedMetadataName;
  }

  private triggerValidation() {
    Object.keys(this.form.controls).forEach(field => {
      const control = this.form.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }

  onClickCancel() {
    this.metadataCreationID.emit(0);
    this.router.navigate([DASHBOARD_USER_METADATA_DIRECTORY]);
  }

  onClickCreate() {
    // check if the form is valid
    this.triggerValidation();

    if (!this.form.valid) {
      return; // Stop further execution if the form is not valid
    }

    this.isUploading = true;

    const metadata = {
      name: this.metadataNameSanitization(this.form.get("name")?.value),
      description: this.form.get("description")?.value,
    };

    this.metadataService
      .createMetadata(metadata)
      .pipe(untilDestroyed(this))
      .subscribe({
        next: res => {
          this.notificationService.success(
            `Metadata '${metadata.name}' Created. ${this.isMetadataNameSanitized ? "We have sanitized your provided metadata name for compatibility reasons" : ""}`
          );
          // this.metadataCreationID.emit(res.metadata.id);
          this.isUploading = false;
        },
        error: (res: unknown) => {
          const err = res as HttpErrorResponse;
          this.notificationService.error(`Metadata ${metadata.name} creation failed: ${err.error.message}`);
          this.isUploading = false;
        },
      });
  }
}
