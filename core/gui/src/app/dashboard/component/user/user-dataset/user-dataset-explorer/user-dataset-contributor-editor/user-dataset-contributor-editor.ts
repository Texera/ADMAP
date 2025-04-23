import { Component, EventEmitter, OnInit, Output, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { NzModalRef } from 'ng-zorro-antd/modal';

export interface ContributorData {
  id?: number;
  name: string;
  creator: boolean;
  role: string;
  email: string;
  affiliation: string;
}

@UntilDestroy()
@Component({
  selector: 'texera-user-dataset-contributor-editor',
  templateUrl: './user-dataset-contributor-editor.html',
  styleUrls: ['./user-dataset-contributor-editor.component.scss']
})
export class UserDatasetContributorEditor implements OnInit {
  @Output() contributorChange = new EventEmitter<ContributorData>();

  public contributorForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    @Inject(NZ_MODAL_DATA) public contributorData: ContributorData,
    private modalRef: NzModalRef
  ) {
    this.contributorForm = this.fb.group({
      name: new FormControl("", [Validators.required]),
      creator: new FormControl(false, [Validators.required]),
      role: new FormControl("", [Validators.required]),
      email: new FormControl("", [Validators.required, Validators.email]),
      affiliation: new FormControl("", [Validators.required]),
    });
  }

  ngOnInit() {
    console.log(this.contributorData);
    if (this.contributorData) {
      this.contributorForm.patchValue({
        name: this.contributorData.name,
        creator: this.contributorData.creator,
        role: this.contributorData.role,
        email: this.contributorData.email,
        affiliation: this.contributorData.affiliation
      });
    }
  }

  public submit(): void {
    if (this.contributorForm.invalid) {
      this.contributorForm.markAllAsTouched();
      return;
    }

    const data: ContributorData = {
      id: this.contributorData?.id,
      ...this.contributorForm.value
    };
    this.contributorChange.emit(data);
    this.modalRef.close(data);
  }


}
