import type { TransformFnParams } from "class-transformer";
import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from "class-validator";

export const purchaseNumberMin = 0.0001;
export const purchaseNumberMax = 100_000_000;
export const purchaseNotesMaxLength = 500;
export const tickerPattern = /^[A-Z][A-Z0-9.-]{0,9}$/;
export const currencyPattern = /^USD$/;
const dangerousNotesPattern =
  /<|>|javascript:|vbscript:|data:text\/html|on[a-z]+\s*=|[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/i;

export function trimString({ value }: TransformFnParams): unknown {
  return typeof value === "string" ? value.trim() : value;
}

export function trimOptionalNotes({ value }: TransformFnParams): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.trim().replace(/\r\n?/g, "\n");
  return normalized.length > 0 ? normalized : undefined;
}

export function trimUppercaseString({ value }: TransformFnParams): unknown {
  return typeof value === "string" ? value.trim().toUpperCase() : value;
}

export function IsSafeNotes(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: "isSafeNotes",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return (
            typeof value !== "string" || !dangerousNotesPattern.test(value)
          );
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} cannot contain HTML, scripts, or control characters`;
        },
      },
    });
  };
}
