export class HostedPaymentPageParametersMapper {
  static fromData(body: { name: string; value: string }[]): { name: string; value: string }[] {
    const hostedPaymentPageParameters: { name: string; value: string }[] = new Array();

    if (body !== undefined) {
      for (const entry of body) {
        if (typeof entry.value !== 'string') {
          const sepaMandateArray = entry.value as { name: string; value: string }[];
          hostedPaymentPageParameters.push({ name: 'mandateId', value: sepaMandateArray['mandateId'] });
          hostedPaymentPageParameters.push({ name: 'mandateText', value: sepaMandateArray['mandateText'] });
          hostedPaymentPageParameters.push({ name: 'directDebitType', value: sepaMandateArray['directDebitType'] });
        } else {
          hostedPaymentPageParameters.push(entry);
        }
      }
    }

    return hostedPaymentPageParameters;
  }
}
