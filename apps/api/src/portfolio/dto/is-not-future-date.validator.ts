import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from "class-validator";

export function IsNotFutureDate(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (target, propertyName) => {
    registerDecorator({
      name: "isNotFutureDate",
      target: target.constructor,
      propertyName: propertyName.toString(),
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== "string") {
            return false;
          }

          const date = new Date(value);
          return !Number.isNaN(date.getTime()) && date.getTime() <= Date.now();
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} must not be in the future`;
        },
      },
    });
  };
}
