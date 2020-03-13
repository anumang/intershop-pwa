import { ComponentFixture, TestBed, async } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { FormlyForm } from '@ngx-formly/core';
import { TranslateModule } from '@ngx-translate/core';
import { MockComponent } from 'ng-mocks';

import { PaymentMethod } from 'ish-core/models/payment-method/payment-method.model';
import { CheckboxComponent } from 'ish-shared/forms/components/checkbox/checkbox.component';

import { PaymentConcardisDirectdebitComponent } from './payment-concardis-directdebit.component';

describe('Payment Concardis Directdebit Component', () => {
  let component: PaymentConcardisDirectdebitComponent;
  let fixture: ComponentFixture<PaymentConcardisDirectdebitComponent>;
  let element: HTMLElement;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        MockComponent(CheckboxComponent),
        MockComponent(FaIconComponent),
        MockComponent(FormlyForm),
        MockComponent(NgbPopover),
        PaymentConcardisDirectdebitComponent,
      ],
      imports: [ReactiveFormsModule, TranslateModule.forRoot()],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PaymentConcardisDirectdebitComponent);
    component = fixture.componentInstance;
    element = fixture.nativeElement;

    component.paymentMethod = {
      id: 'Concardis_DirectDebit',
      saveAllowed: false,
      parameters: [{ key: 'key1', name: 'name', templateOptions: { label: 'input' } }],
    } as PaymentMethod;
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
    expect(element).toBeTruthy();
    expect(() => fixture.detectChanges()).not.toThrow();
  });
});
