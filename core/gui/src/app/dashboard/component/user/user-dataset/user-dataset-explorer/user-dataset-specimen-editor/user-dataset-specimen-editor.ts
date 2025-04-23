import { Component, EventEmitter, OnInit, Output, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { NzModalRef } from 'ng-zorro-antd/modal';

export interface SpecimenData {
  id: string;
  species: string;
  age: {
    value: number;
    unit: string;
  };
  sex: string;
  notes: string;
}

@UntilDestroy()
@Component({
  selector: 'texera-user-dataset-specimen-editor',
  templateUrl: './user-dataset-specimen-editor.html',
  styleUrls: ['./user-dataset-specimen-editor.component.scss']
})
export class UserDatasetSpecimenEditor implements OnInit {
  @Output() specimenChange = new EventEmitter<SpecimenData>();

  public specimenForm: FormGroup;
  public ageUnits = ['Months', 'Years'];
  public sexOptions = ['Male', 'Female'];
  public species = [
    'Human',
    'Mouse',
    'Rat',
    'Degu',
    'Monkey',
    'Other'];

  constructor(
    private fb: FormBuilder,
    @Inject(NZ_MODAL_DATA) public specimenData: SpecimenData,
    private modalRef: NzModalRef
  ) {
    this.specimenForm = this.fb.group({
      id:        new FormControl('', [Validators.required]),
      species:   new FormControl(this.species[0], [Validators.required]),
      ageValue:  new FormControl(null, [Validators.required, Validators.min(0)]),
      ageUnit:   new FormControl(this.ageUnits[0], [Validators.required]),
      sex:       new FormControl(this.sexOptions[2], [Validators.required]),
      notes:     new FormControl('', [])

    });
  }

  ngOnInit() {
    console.log(this.specimenData);
    if (this.specimenData) {
      this.specimenForm.patchValue({
        id:       this.specimenData.id,
        species:  this.specimenData.species,
        ageValue: this.specimenData.age.value,
        ageUnit:  this.specimenData.age.unit,
        sex:      this.specimenData.sex,
        notes:    this.specimenData.notes
      });
    }
  }

  public submit(): void {
    if (this.specimenForm.invalid) {
      this.specimenForm.markAllAsTouched();
      return;
    }

    const form = this.specimenForm.value;
    const data: SpecimenData = {
      id: form.id,
      species: form.species,
      age: {
        value: form.ageValue,
        unit: form.ageUnit
      },
      sex: form.sex,
      notes: form.notes
    };

    this.specimenChange.emit(data);
    this.modalRef.close(data);
  }

  public cancel(): void {
    this.modalRef.close();
  }
}
