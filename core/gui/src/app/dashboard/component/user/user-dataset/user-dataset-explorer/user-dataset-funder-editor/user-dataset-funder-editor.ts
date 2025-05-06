import { Component, EventEmitter, OnInit, Output, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { UntilDestroy } from '@ngneat/until-destroy';
import { NzModalRef } from 'ng-zorro-antd/modal';

export interface FunderData {
  id?: number;
  name: string;
  awardTitle: string;
}

@UntilDestroy()
@Component({
  selector: 'texera-user-dataset-funder-editor',
  templateUrl: './user-dataset-funder-editor.html',
  styleUrls: ['./user-dataset-funder-editor.component.scss']
})
export class UserDatasetFunderEditor implements OnInit {
  @Output() funderChange = new EventEmitter<FunderData>();

  public funderForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    @Inject(NZ_MODAL_DATA) public funderData: FunderData,
    private modalRef: NzModalRef
  ) {
    this.funderForm = this.fb.group({
      name: new FormControl("", [Validators.required]),
      awardTitle: new FormControl("", []),
    });
  }

  ngOnInit() {
    console.log(this.funderData);
    if (this.funderData) {
      this.funderForm.patchValue({
        name: this.funderData.name,
        awardTitle: this.funderData.awardTitle,
      });
    }
  }

  public submit(): void {
    if (this.funderForm.invalid) {
      this.funderForm.markAllAsTouched();
      return;
    }

    const data: FunderData = {
      id: this.funderData?.id,
      ...this.funderForm.value
    };
    this.funderChange.emit(data);
    this.modalRef.close(data);
  }

  public cancel(): void {
    this.modalRef.close();
  }

}
