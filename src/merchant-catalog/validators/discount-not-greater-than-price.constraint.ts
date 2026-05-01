import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  Validate,
} from 'class-validator';

@ValidatorConstraint({ name: 'discountNotGreaterThanPrice', async: false })
export class DiscountNotGreaterThanPriceConstraint
  implements ValidatorConstraintInterface
{
  validate(discountPrice: unknown, args: ValidationArguments): boolean {
    if (
      discountPrice === undefined ||
      discountPrice === null ||
      (typeof discountPrice === 'string' && discountPrice === '')
    ) {
      return true;
    }
    const obj = args.object as { price?: number };
    const price = obj.price;
    if (price === undefined || price === null) {
      return true;
    }
    const d = Number(discountPrice);
    const p = Number(price);
    if (Number.isNaN(d) || Number.isNaN(p)) {
      return true;
    }
    return d <= p;
  }

  defaultMessage(): string {
    return 'discountPrice cannot be greater than price';
  }
}

/** On `discountPrice`; compares to `price` on the same DTO (create / multipart). */
export function ValidateDiscountNotAbovePrice(): PropertyDecorator {
  return Validate(DiscountNotGreaterThanPriceConstraint);
}
