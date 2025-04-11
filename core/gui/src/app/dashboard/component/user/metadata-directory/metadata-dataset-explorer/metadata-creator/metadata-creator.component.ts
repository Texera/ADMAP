import {Component, EventEmitter, inject, Input, OnInit, Output} from "@angular/core";
import { FormBuilder, FormGroup, FormArray, Validators } from "@angular/forms";
import { FormlyFieldConfig } from "@ngx-formly/core";
import { MetadataService } from "../../../../../service/user/metadata/metadata.service";
import { DatasetService } from "../../../../../service/user/dataset/dataset.service";

import { Metadata } from "../../../../../../common/type/Metadata";

import { FileUploadItem } from "../../../../../type/dashboard-file.interface";
import {UntilDestroy, untilDestroyed} from "@ngneat/until-destroy";
import { NotificationService } from "../../../../../../common/service/notification/notification.service";
import {NZ_MODAL_DATA, NzModalRef} from "ng-zorro-antd/modal";
import {HttpErrorResponse} from "@angular/common/http";
import {Dataset} from "../../../../../../common/type/dataset";

@UntilDestroy()
@Component({
  selector: "texera-metadata-creator",
  templateUrl: "./metadata-creator.component.html",
  styleUrls: ["./metadata-creator.component.scss"],
})
export class MetadataCreatorComponent implements OnInit {
  readonly isCreatingMetadata: boolean = inject(NZ_MODAL_DATA).isCreatingMetadata;

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
  isCreating: boolean = false;

  constructor(
    private modalRef: NzModalRef,
    private datasetService: DatasetService,
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
      {
        key: 'contributors',
        type: 'array',
        templateOptions: {
          label: 'Contributors',
        },
        fieldArray: {
          fieldGroup: [
            {
              key: 'name',
              type: 'input',
              templateOptions: {
                label: "Contributor's Name",
                placeholder: "Contributor's Name",
                required: true,
              },
            },
            {
              key: 'creator',
              type: 'checkbox',
              templateOptions: {
                label: 'Creator',
              },
            },
            {
              key: 'role',
              type: 'select',
              templateOptions: {
                label: 'Contributor Role',
                required: true,
                options: [
                  { label: 'Researcher', value: 'Researcher' },
                  { label: 'Principal Investigator (PI)', value: 'Principal Investigator' },
                  { label: 'Project Member', value: 'Project Member' },
                  { label: 'Other', value: 'Other' },
                ],
              },
            },
            {
              key: 'affiliation',
              type: 'input',
              templateOptions: {
                label: 'Department',
                required: true,
                placeholder: 'Department',
              },
            },
            {
              key: 'email',
              type: 'input',
              templateOptions: {
                label: 'Email',
                required: true,
                placeholder: 'Email',
                type: 'email',
              },
            },
          ],
        },
      },
      {
        key: 'funders',
        type: 'array',
        templateOptions: {
          label: 'Funders',
        },
        fieldArray: {
          fieldGroup: [
            {
              key: 'name',
              type: 'input',
              templateOptions: {
                label: "Funder's Name",
                placeholder: "Funder's Name",
              },
            },
            {
              key: 'award',
              type: 'input',
              templateOptions: {
                label: 'Award title',
                placeholder: 'Award title',
              },
            },
          ],
        },
      },
      {
        key: 'specimens',
        type: 'array',
        templateOptions: {
          label: 'Specimens',
        },
        fieldArray: {
          fieldGroup: [
            {
              key: 'id',
              type: 'input',
              templateOptions: {
                label: "Specimen's ID",
                required: true,
                placeholder: "Specimen's ID",
              },
            },
            {
              key: 'species',
              type: 'select',
              templateOptions: {
                label: 'Specimen Species',
                required: true,
                options: [
                  { label: 'Human', value: 'Human' },
                  { label: 'Mouse', value: 'Mouse' },
                  { label: 'Rat', value: 'Rat' },
                  { label: 'Degu', value: 'Degu' },
                  { label: 'Monkey', value: 'Monkey' },
                  { label: 'Other', value: 'Other' },
                ],
              },
            },
            {
              key: 'speciesOther',
              type: 'input',
              templateOptions: {
                label: 'Specify other specimen species',
                placeholder: 'Other specimen',
              },
              hideExpression: (model: any) => model?.type !== 'Other',
            },

            {
              key: 'age',
              fieldGroup: [
                {
                  key: 'value',
                  type: 'input',
                  templateOptions: {
                    type: 'number',
                    label: 'Age',
                    placeholder: 'Age',
                    min: 0,
                  },
                },
                {
                  key: 'unit',
                  type: 'select',
                  defaultValue: 'Years',
                  templateOptions: {
                    label: 'Unit',
                    options: [
                      { label: 'Years', value: 'Years' },
                      { label: 'Months', value: 'Months' },
                    ],
                  },
                },
              ],
            },

            {
              key: 'sex',
              type: 'select',
              templateOptions: {
                label: 'Sex',
                options: [
                  { label: 'Male', value: 'Male' },
                  { label: 'Female', value: 'Female' },
                ],
              },
            },
            {
              key: 'notes',
              type: 'input',
              templateOptions: {
                type: 'text',
                label: 'Notes',
                placeholder:
                  'Any additional notes (e.g., Non-AD, AD, MAPT, under cage, inject 50um chemicals)',
              },
            },
          ],
        },
      }

    ]
  }

  metadataNameSanitization(metadataName: string): string {
    // Remove leading spaces
    let sanitizedMetadataName = metadataName.trimStart();

    // Replace all characters that are not letters (a-z, A-Z), numbers (0-9) with a short dash "-"
    sanitizedMetadataName = sanitizedMetadataName.replace(/[^a-zA-Z0-9]+/g, "-");

    if (sanitizedMetadataName !== metadataName) {
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
    this.modalRef.close(null);
  }

  onClickCreate() {
    // Check if the form is valid
    this.triggerValidation();

    if (!this.form.valid) {
      return; // Stop further execution if the form is not valid
    }
    console.log("Form Data:", this.form.value);

    this.isCreating = true;

    const ds: Dataset = {
      name: this.metadataNameSanitization(this.form.get("name")?.value),
      description: this.form.get("description")?.value,
      isPublic: this.isMetadataPublic,
      did: undefined,
      ownerUid: undefined,
      storagePath: undefined,
      creationTime: undefined,
    }

    const md: Metadata = {
      name: this.metadataNameSanitization(this.form.get("name")?.value),
      description: this.form.get("description")?.value,
      contributors: this.form.get('contributors')?.value.map((contributor: any) => ({
        name: contributor.name,
        creator: contributor.creator,
        role: contributor.role,
        affiliation: contributor.affiliation,
        email: contributor.email,
      })),

      funders: this.form.get('funders')?.value.map((funder: any) => ({
        name: funder.name,
        awardTitle: funder.award,
      })),

      specimens: this.form.get('specimens')?.value.map((specimen: any) => ({
        id: specimen.id,
        species: specimen.species,
        typeOther: specimen.speciesOther,
        age: {
          value: specimen.age?.value,
          unit: specimen.age?.unit,
        },
        sex: specimen.sex,
        notes: specimen.notes,
      })),

      isPublic: this.isMetadataPublic,
      mid: undefined,
      ownerUid: undefined,
      storagePath: undefined,
      creationTime: undefined,
    };

    this.datasetService
      // TODO, replace with this.metadataService and createMetadata(ds)
      // .createMetadata(ds)
      .createDataset(ds)
      .pipe(untilDestroyed(this))
      .subscribe({
        next: res => {
          this.notificationService.success(
            `Dataset '${md.name}' Created. ${this.isMetadataNameSanitized ? "We have sanitized your provided dataset name for the compatibility reason" : ""}`
          );
          this.isCreating = false;
          // if creation succeed, emit the created dashboard dataset
          this.modalRef.close(res);
        },
        error: (res: unknown) => {
          const err = res as HttpErrorResponse;
          this.notificationService.error(`Dataset ${md.name} creation failed: ${err.error.message}`);
          this.isCreating = false;
          // if creation failed, emit null value
          this.modalRef.close(null);
        },
      });
  }

  onPublicStatusChange(newValue: boolean): void {
    // Handle the change in metadata public status
    this.isMetadataPublic = newValue;
  }
}
