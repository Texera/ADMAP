import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { FormBuilder, FormGroup, FormArray, Validators } from "@angular/forms";
import { FormlyFieldConfig } from "@ngx-formly/core";
import { MetadataService } from "../../../../../service/user/metadata/metadata.service";
import { FileUploadItem } from "../../../../../type/dashboard-file.interface";
import { UntilDestroy } from "@ngneat/until-destroy";
import { NotificationService } from "../../../../../../common/service/notification/notification.service";
import sanitize from "sanitize-filename";
import { Router } from "@angular/router";
import { DASHBOARD_USER_METADATA_DIRECTORY } from "../../../../../../app-routing.constant";

@UntilDestroy()
@Component({
  selector: "texera-metadata-creator",
  templateUrl: "./metadata-creator.component.html",
  styleUrls: ["./metadata-creator.component.scss"],
})
export class MetadataCreatorComponent implements OnInit {
  @Input()
  isCreatingMetadata: boolean = false;

  @Output()
  metadataCreationID: EventEmitter<number> = new EventEmitter<number>();

  isCreateButtonDisabled: boolean = false;
  newUploadFiles: FileUploadItem[] = [];
  removedFilePaths: string[] = [];

  public form: FormGroup = new FormGroup({});
  model: any = {};
  fields: FormlyFieldConfig[] = [];
  isMetadataPublic: boolean = false;
  isMetadataNameSanitized: boolean = false;
  isUploading: boolean = false;


  contributorRoles = [
    "Contact Person",
    "Data Collector",
    "Data Curator",
    "Project Leader",
    "Project Manager",
    "Project Member",
    "Related Person",
    "Researcher",
    "Research Group",
    "Other"
  ];

  constructor(
    private router: Router,
    private metadataService: MetadataService,
    private notificationService: NotificationService,
    private formBuilder: FormBuilder
  ) {}

  ngOnInit() {
    this.form = this.formBuilder.group({
      name: ["", Validators.required],
      contributors: this.formBuilder.array([]),
      funders: this.formBuilder.array([]),
      specimens: this.formBuilder.array([]),
    });

    console.log("FORM:", this.form);


    this.isMetadataNameSanitized = false;
  }

  // Getters for form arrays
  get contributors() {
    return this.form.get("contributors") as FormArray;
  }

  get funders() {
    return this.form.get("funders") as FormArray;
  }

  get specimens() {
    return this.form.get("specimens") as FormArray;
  }

  // Add a new contributor
  addContributor() {
    const contributorGroup = this.formBuilder.group({
      name: ["", Validators.required],
      creator: [false], // Checkbox for creator
      role: ["", Validators.required],
      affiliation: ["", Validators.required],
    });

    this.contributors.push(contributorGroup);
  }

  // Remove a contributor
  removeContributor(index: number) {
    this.contributors.removeAt(index);
  }

  // Add a new funder
  addFunder() {
    const funderGroup = this.formBuilder.group({
      name: ["", Validators.required],
      awardTitle: ["", Validators.required],
    });

    this.funders.push(funderGroup);
  }

  // Remove a funder
  removeFunder(index: number) {
    this.funders.removeAt(index);
  }

  // Add a new specimen
  addSpecimen() {
    const specimenGroup = this.formBuilder.group({
      id: ["", Validators.required],
      specimen: ["", Validators.required],
      age: ["", [Validators.required, Validators.min(0)]],
      sex: ["", Validators.required], // Male, Female, Unknown
    });

    this.specimens.push(specimenGroup);
  }

  // Remove a specimen
  removeSpecimen(index: number) {
    this.specimens.removeAt(index);
  }

  metadataNameSanitization(metadataName: string): string {
    const sanitizedMetadataName = sanitize(metadataName);
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
    this.metadataCreationID.emit(0);
    this.router.navigate([DASHBOARD_USER_METADATA_DIRECTORY]);
  }

  onClickCreate() {
    // Check if the form is valid
    this.triggerValidation();

    if (!this.form.valid) {
      return; // Stop further execution if the form is not valid
    }
    console.log("Form Data:", this.form.value);

    this.isUploading = true;
    const metadataPayload = {
      metadataName: this.metadataNameSanitization(this.form.get("name")?.value), // Metadata Name
      contributors: this.contributors.value.map((contributor: any) => ({
        name: contributor.name,
        creator: contributor.creator,
        contributorType: contributor.role,
        affiliation: contributor.affiliation
      })),
      funders: this.funders.value.map((funder: any) => ({
        name: funder.name,
        awardTitle: funder.awardTitle
      })),
      specimens: this.specimens.value.map((specimen: any) => ({
        name: specimen.specimen,
        age: specimen.age,
        sex: specimen.sex
      })),
    };

    console.log("Sending Metadata Payload:", metadataPayload);

    this.metadataService.createMetadata(metadataPayload).subscribe({
      next: (res) => {
        this.notificationService.success(
          `Metadata '${metadataPayload.metadataName}' created successfully!`
        );
        this.isUploading = false;
      },
      error: (err) => {
        console.error("Metadata creation failed:", err);
        this.notificationService.error(`Metadata creation failed: ${err.message}`);
        this.isUploading = false;
      },
    });
  }
}
