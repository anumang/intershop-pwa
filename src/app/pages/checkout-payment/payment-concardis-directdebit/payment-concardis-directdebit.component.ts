import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { FormGroup, Validators } from '@angular/forms';
import { FormlyFieldConfig, FormlyFormOptions } from '@ngx-formly/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { Attribute } from 'ish-core/models/attribute/attribute.model';
import { PaymentMethod } from 'ish-core/models/payment-method/payment-method.model';
import { ScriptLoaderService } from 'ish-core/utils/script-loader/script-loader.service';
import { markAsDirtyRecursive } from 'ish-shared/forms/utils/form-utils';

// allows access to concardis js functionality
// tslint:disable-next-line:no-any
declare var PayEngine: any;

/**
 * The Payment Concardis Directdebit Component renders a form on which the user can enter his concardis direct debit data. Some entry fields are provided by an external host and embedded as iframes. Therefore an external javascript is loaded. See also {@link CheckoutPaymentPageComponent}
 *
 * @example
 * <ish-payment-concardis-directdebit
 [paymentMethod]="paymentMethod"
 [activated]="i === openFormIndex"
 (submit)="createNewPaymentInstrument($event)"
 (cancel)="cancelNewPaymentInstrument()"
></ish-payment-concardis-directdebit>
 */
@Component({
  selector: 'ish-payment-concardis-directdebit',
  templateUrl: './payment-concardis-directdebit.component.html',
  changeDetection: ChangeDetectionStrategy.Default,
})
// tslint:disable-next-line:ccp-no-intelligence-in-components
export class PaymentConcardisDirectdebitComponent implements OnInit, OnChanges, OnDestroy {
  /**
   * concardis payment method, needed to get configuration parameters
   */
  @Input() paymentMethod: PaymentMethod;

  /**
   * should be set to true by the parent, if component is visible
   */
  @Input() activated = false;

  @Output() cancel = new EventEmitter<void>();
  @Output() submit = new EventEmitter<{ parameters: Attribute[]; saveAllowed: boolean }>();

  parameterForm: FormGroup; // form for parameters which doesnt come form payment host
  model = {};
  options: FormlyFormOptions = {};

  scriptLoaded = false; // flag to make sure that the init script is executed only once
  formSubmitted = false; // flag for displaying error messages after form submit

  // error messages from host
  errorMessage = {
    general: { message: '' },
    iban: { messageKey: '', message: '', code: 0 },
    bic: { messageKey: '', message: '', code: 0 },
    accountholder: { messageKey: '', message: '', code: 0 },
  };

  private destroy$ = new Subject();

  constructor(private scriptLoader: ScriptLoaderService, private cd: ChangeDetectorRef) {}

  /**
   * initialize parameter form on init
   */
  ngOnInit() {
    this.parameterForm = new FormGroup({});
  }

  /* ---------------------------------------- load concardis script if component is visible ------------------------------------------- */

  /**
   * load concardis script if component is shown
   */
  ngOnChanges() {
    if (this.paymentMethod) {
      this.loadScript();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
  }

  handleErrors(controlName: string, message: string) {
    this.parameterForm.controls[controlName].markAsDirty();
    this.parameterForm.controls[controlName].markAsTouched();
    this.parameterForm.controls[controlName].setErrors({ customError: message });
  }

  loadScript() {
    // load script only once if component becomes visible
    if (this.activated && !this.scriptLoaded) {
      const merchantId = this.getParamValue(
        'ConcardisPaymentService.MerchantID',
        'checkout.credit_card.merchantId.error.notFound'
      );

      const url =
        this.getParamValue('ConcardisPaymentService.Environment', '') === 'LIVE'
          ? 'https://pp.payengine.de/bridge/1.0/payengine.min.js'
          : 'https://pptest.payengine.de/bridge/1.0/payengine.min.js';

      this.scriptLoaded = true;
      this.scriptLoader
        .load(url)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          PayEngine.setPublishableKey(merchantId);
        });
    }
  }

  /**
   * gets a parameter value from payment method
   * sets the general error message (key) if the parameter is not available
   */
  private getParamValue(name: string, errorMessage: string): string {
    const parameter = this.paymentMethod.hostedPaymentPageParameters.find(param => param.name === name);
    if (!parameter || !parameter.value) {
      this.errorMessage.general.message = errorMessage;
      return;
    }
    return parameter.value;
  }

  /**
   * hide fields without labels and enrich mandate reference and mandate text with corresponding values from hosted payment page parameters
   */
  getFieldConfig(): FormlyFieldConfig[] {
    const fields: FormlyFieldConfig[] = [];
    for (const param of this.paymentMethod.parameters) {
      if (!param.templateOptions.label) {
        if (param.key === 'mandateReference') {
          param.defaultValue = this.getParamValue('mandateId', '');
        }
        param.hide = true;
        if (param.key === 'mandateText') {
          param.type = 'checkbox';
          param.fieldGroupClassName = 'offset-md-4 col-md-8';
          param.templateOptions.label = this.getParamValue('mandateText', '');
          param.defaultValue = false;
          param.hide = false;
          param.validators = [Validators.pattern('false')];
        }
      }
      fields.push(param);
    }
    return fields;
  }

  /* ---------------------------------------- concardis callback functions  ------------------------------------------- */

  /**
   * call back function to submit data, get a response token from provider and send data in case of success
   */
  submitCallback(
    error: { message: { properties: { key: string; code: number; message: string; messageKey: string }[] } | string },
    result: {
      paymentInstrumentId: string;
      attributes: {
        accountHolder: string;
        iban: string;
        mandateReference: string;
        mandate: {
          mandateReference: string;
          createdDateTime: string;
          mandateText: string;
          directDebitType: string;
        };
        createdAt: string;
      };
    }
  ) {
    if (this.parameterForm.invalid) {
      this.formSubmitted = true;
      markAsDirtyRecursive(this.parameterForm);
    }

    this.resetErrors();
    if (error) {
      // map error messages
      if (typeof error.message !== 'string' && error.message.properties) {
        this.errorMessage.iban = error.message.properties && error.message.properties.find(prop => prop.key === 'iban');
        if (this.errorMessage.iban && this.errorMessage.iban.code) {
          this.errorMessage.iban.messageKey = this.getErrorMessage(
            this.errorMessage.iban.code,
            'iban',
            this.errorMessage.iban.message
          );
          this.handleErrors('IBAN', this.errorMessage.iban.messageKey);
        }

        this.errorMessage.bic = error.message.properties && error.message.properties.find(prop => prop.key === 'bic');
        if (this.errorMessage.bic && this.errorMessage.bic.code) {
          this.errorMessage.bic.messageKey = this.getErrorMessage(
            this.errorMessage.bic.code,
            'bic',
            this.errorMessage.bic.message
          );
          this.handleErrors('BIC', this.errorMessage.bic.messageKey);
        }

        this.errorMessage.accountholder =
          error.message.properties && error.message.properties.find(prop => prop.key === 'accountholder');
        if (this.errorMessage.accountholder && this.errorMessage.accountholder.code) {
          this.errorMessage.accountholder.messageKey = this.getErrorMessage(
            this.errorMessage.accountholder.code,
            'bic',
            this.errorMessage.accountholder.message
          );
          this.handleErrors('accountHolder', this.errorMessage.accountholder.messageKey);
        }
      } else if (typeof error.message === 'string') {
        this.errorMessage.general.message = error.message;
      }
    } else if (!this.parameterForm.invalid) {
      this.submit.emit({
        parameters: [
          { name: 'paymentInstrumentId', value: result.paymentInstrumentId },
          { name: 'accountHolder', value: result.attributes.accountHolder },
          { name: 'IBAN', value: result.attributes.iban },
          { name: 'mandateReference', value: result.attributes.mandate.mandateReference },
          { name: 'mandateText', value: result.attributes.mandate.mandateText },
          { name: 'mandateCreatedDateTime', value: result.attributes.mandate.createdDateTime },
        ],
        saveAllowed: this.paymentMethod.saveAllowed && this.parameterForm.get('saveForLater').value,
      });
    }
    this.cd.detectChanges();
  }

  /* ---------------------------------------- error message handling  ------------------------------------------- */

  /**
   * reset errorMessages
   */
  resetErrors() {
    this.errorMessage.general.message = undefined;
    if (this.errorMessage.accountholder) {
      this.errorMessage.accountholder.message = undefined;
      this.errorMessage.accountholder.messageKey = undefined;
      this.errorMessage.accountholder.code = undefined;
    }
    if (this.errorMessage.iban) {
      this.errorMessage.iban.message = undefined;
      this.errorMessage.iban.messageKey = undefined;
      this.errorMessage.iban.code = undefined;
    }
    if (this.errorMessage.bic) {
      this.errorMessage.bic.message = undefined;
      this.errorMessage.bic.messageKey = undefined;
      this.errorMessage.bic.code = undefined;
    }
  }

  /**
   * determine errorMessages on the basis of the error code
   */
  getErrorMessage(code: number, fieldType: string, defaultMessage: string): string {
    let messageKey: string;

    switch (code) {
      case 4121: {
        messageKey = `checkout.sepa.${fieldType}.error.default`;
        break;
      }
      case 4122: {
        messageKey = `checkout.sepa.${fieldType}.error.default`;
        break;
      }
      case 4124: {
        messageKey = `checkout.sepa.${fieldType}.error.notAlphanumeric`;
        break;
      }
      case 41213: {
        messageKey = `checkout.sepa.${fieldType}.error.countryNotSupported`;
        break;
      }
      case 41214: {
        messageKey = `checkout.sepa.${fieldType}.error.length`;
        break;
      }

      case 41215: {
        messageKey = `checkout.sepa.${fieldType}.error.invalid`;
        break;
      }

      case 41216: {
        messageKey = `checkout.sepa.${fieldType}.error.length`;
        break;
      }

      case 41217: {
        messageKey = `checkout.sepa.${fieldType}.error.countryNotSupported`;
        break;
      }
      default: {
        messageKey = defaultMessage;
        break;
      }
    }

    return messageKey;
  }

  /* ---------------------------------------- cancel and submit form  ------------------------------------------- */

  /**
   * cancel new payment instrument, hides and resets the parameter form
   */
  cancelNewPaymentInstrument() {
    this.parameterForm.reset();
    this.resetErrors();
    this.cancel.emit();
  }

  /**
   * submit concardis payment form
   */
  submitNewPaymentInstrument() {
    const parameters = Object.entries(this.parameterForm.controls)
      .filter(([, control]) => control.enabled && control.value)
      .map(([key, control]) => ({ name: key, value: control.value }));

    let paymentData: {
      accountHolder: string;
      bic?: string;
      iban: string;
      mandate: { mandateId: string; mandateText: string; directDebitType: string };
    } = {
      accountHolder: parameters.find(p => p.name === 'accountHolder')
        ? parameters.find(p => p.name === 'accountHolder').value
        : undefined,
      iban: parameters.find(p => p.name === 'IBAN') ? parameters.find(p => p.name === 'IBAN').value : undefined,
      mandate: {
        mandateId: parameters.find(p => p.name === 'mandateReference')
          ? parameters.find(p => p.name === 'mandateReference').value
          : undefined,
        mandateText: this.getParamValue('mandateText', ''),
        directDebitType: this.getParamValue('directDebitType', ''),
      },
    };

    if (parameters.find(p => p.name === 'BIC')) {
      paymentData = { ...paymentData, bic: parameters.find(p => p.name === 'BIC').value };
    }
    // tslint:disable-next-line:no-null-keyword
    PayEngine.createPaymentInstrument('sepa', paymentData, null, (err, val) => this.submitCallback(err, val));
  }
}
