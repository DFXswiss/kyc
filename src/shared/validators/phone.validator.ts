import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import * as libphonenumber from 'google-libphonenumber';

@ValidatorConstraint({ name: 'IsPhone' })
export class PhoneValidator implements ValidatorConstraintInterface {
  validate(phoneNumber: string) {
    try {
      const phoneUtil = libphonenumber.PhoneNumberUtil.getInstance();
      return (
        phoneNumber && phoneNumber.match(/^\+/) && phoneUtil.isValidNumber(phoneUtil.parseAndKeepRawInput(phoneNumber))
      );
    } catch (_) {
      return false;
    }
  }

  defaultMessage() {
    return `phone number not valid`;
  }
}

export function IsPhone(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'IsPhone',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: PhoneValidator,
    });
  };
}
