import { Component } from "@angular/core";
import { FormBuilder, FormGroup, FormArray, Validators } from "@angular/forms";

@Component({
  selector: "texera-user-contributors-form",
  templateUrl: "./contributors-form.component.html",
  styleUrls: ["./contributors-form.component.scss"],
})
export class ContributorsFormComponent {
  contributorsForm!: FormGroup;

  // List of contributor roles
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

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.contributorsForm = this.fb.group({
      contributors: this.fb.array([]), // Initialize FormArray for contributors
      funders: this.fb.array([]), // Initialize FormArray for funders
      specimens: this.fb.array([]) // Initialize FormArray for specimens
    });
  }

  // Getters for form arrays
  get contributors() {
    return this.contributorsForm.get("contributors") as FormArray;
  }

  get funders() {
    return this.contributorsForm.get("funders") as FormArray;
  }

  get specimens() {
    return this.contributorsForm.get("specimens") as FormArray;
  }

  // Add a new contributor
  addContributor() {
    const contributorGroup = this.fb.group({
      name: ["", Validators.required],
      creator: [false], // Checkbox for creator
      role: ["", Validators.required],
      affiliation: ["", Validators.required] // Affiliation field
    });

    this.contributors.push(contributorGroup);
  }

  // Remove a contributor
  removeContributor(index: number) {
    this.contributors.removeAt(index);
  }

  // Add a new funder
  addFunder() {
    const funderGroup = this.fb.group({
      name: ["", Validators.required],
      awardTitle: ["", Validators.required]
    });

    this.funders.push(funderGroup);
  }

  // Remove a funder
  removeFunder(index: number) {
    this.funders.removeAt(index);
  }

  // Add a new specimen
  addSpecimen() {
    const specimenGroup = this.fb.group({
      id: ["", Validators.required],
      specimen: ["", Validators.required],
      age: ["", [Validators.required, Validators.min(0)]],
      sex: ["", Validators.required] // Male, Female, Unknown
    });

    this.specimens.push(specimenGroup);
  }

  // Remove a specimen
  removeSpecimen(index: number) {
    this.specimens.removeAt(index);
  }
}
