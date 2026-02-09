"use client";

import React from "react";
import { useForm, Controller, type SubmitHandler } from "react-hook-form";
import { cn } from "../../lib/utils";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Separator } from "../ui/separator";
import { Button } from "../ui/button";
import { type FormElement } from "./types";

interface FormRendererProps {
  elements: FormElement[];
  onSubmit: SubmitHandler<Record<string, unknown>>;
  defaultValues?: Record<string, unknown>;
  submitButtonText?: string;
  showSubmitButton?: boolean;
  className?: string;
}

interface ElementRendererProps {
  element: FormElement;
  register: ReturnType<typeof useForm>["register"];
  control: ReturnType<typeof useForm>["control"];
  errors: ReturnType<typeof useForm>["formState"]["errors"];
}

function getValidationRules(element: FormElement) {
  const rules: Record<string, unknown> = {};

  if (element.required) {
    rules.required = `${element.label} is required`;
  }

  if (element.validation) {
    if (element.validation.minLength !== undefined) {
      rules.minLength = {
        value: element.validation.minLength as number,
        message: `${element.label} must be at least ${element.validation.minLength} characters`,
      };
    }
    if (element.validation.maxLength !== undefined) {
      rules.maxLength = {
        value: element.validation.maxLength as number,
        message: `${element.label} must be at most ${element.validation.maxLength} characters`,
      };
    }
    if (element.validation.min !== undefined) {
      rules.min = {
        value: element.validation.min as number,
        message: `${element.label} must be at least ${element.validation.min}`,
      };
    }
    if (element.validation.max !== undefined) {
      rules.max = {
        value: element.validation.max as number,
        message: `${element.label} must be at most ${element.validation.max}`,
      };
    }
    if (element.validation.pattern !== undefined) {
      rules.pattern = {
        value: new RegExp(element.validation.pattern as string),
        message: `${element.label} format is invalid`,
      };
    }
  }

  return rules;
}

function ElementRenderer({
  element,
  register,
  control,
  errors,
}: ElementRendererProps) {
  const error = errors[element.id];
  const validationRules = getValidationRules(element);

  switch (element.type) {
    case "text":
      return (
        <FormField
          element={element}
          error={error?.message as string | undefined}
        >
          <Input
            id={element.id}
            type="text"
            placeholder={element.placeholder}
            aria-invalid={!!error}
            {...register(element.id, validationRules)}
          />
        </FormField>
      );

    case "textarea":
      return (
        <FormField
          element={element}
          error={error?.message as string | undefined}
        >
          <Textarea
            id={element.id}
            placeholder={element.placeholder}
            aria-invalid={!!error}
            {...register(element.id, validationRules)}
          />
        </FormField>
      );

    case "number":
      return (
        <FormField
          element={element}
          error={error?.message as string | undefined}
        >
          <Input
            id={element.id}
            type="number"
            placeholder={element.placeholder}
            aria-invalid={!!error}
            {...register(element.id, {
              ...validationRules,
              valueAsNumber: true,
            })}
          />
        </FormField>
      );

    case "date":
      return (
        <FormField
          element={element}
          error={error?.message as string | undefined}
        >
          <Input
            id={element.id}
            type="date"
            placeholder={element.placeholder}
            aria-invalid={!!error}
            {...register(element.id, validationRules)}
          />
        </FormField>
      );

    case "email":
      return (
        <FormField
          element={element}
          error={error?.message as string | undefined}
        >
          <Input
            id={element.id}
            type="email"
            placeholder={element.placeholder}
            aria-invalid={!!error}
            {...register(element.id, {
              ...validationRules,
              // Default email pattern if not specified
              pattern: validationRules.pattern
                ? (validationRules.pattern as { value: RegExp; message: string })
                : {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Please enter a valid email address",
                  },
            })}
          />
        </FormField>
      );

    case "phone":
      return (
        <FormField
          element={element}
          error={error?.message as string | undefined}
        >
          <Input
            id={element.id}
            type="tel"
            placeholder={element.placeholder}
            aria-invalid={!!error}
            {...register(element.id, validationRules)}
          />
        </FormField>
      );

    case "file":
      return (
        <FormField
          element={element}
          error={error?.message as string | undefined}
        >
          <Input
            id={element.id}
            type="file"
            aria-invalid={!!error}
            {...register(element.id, validationRules)}
          />
        </FormField>
      );

    case "select":
      return (
        <FormField
          element={element}
          error={error?.message as string | undefined}
        >
          <Controller
            name={element.id}
            control={control}
            rules={validationRules}
            render={({ field }) => (
              <Select
                value={field.value as string}
                onValueChange={field.onChange}
              >
                <SelectTrigger className="w-full" aria-invalid={!!error}>
                  <SelectValue placeholder={element.placeholder ?? "Select..."} />
                </SelectTrigger>
                <SelectContent>
                  {element.options?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
      );

    case "radio":
      return (
        <FormField
          element={element}
          error={error?.message as string | undefined}
        >
          <Controller
            name={element.id}
            control={control}
            rules={validationRules}
            render={({ field }) => (
              <RadioGroup
                value={field.value as string}
                onValueChange={field.onChange}
                aria-invalid={!!error}
              >
                {element.options?.map((option) => (
                  <div key={option.value} className="flex items-center gap-2">
                    <RadioGroupItem
                      value={option.value}
                      id={`${element.id}_${option.value}`}
                    />
                    <Label
                      htmlFor={`${element.id}_${option.value}`}
                      className="font-normal cursor-pointer"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          />
        </FormField>
      );

    case "checkbox":
      return (
        <FormField
          element={element}
          error={error?.message as string | undefined}
        >
          <Controller
            name={element.id}
            control={control}
            rules={validationRules}
            defaultValue={[]}
            render={({ field }) => (
              <div className="space-y-2">
                {element.options?.map((option) => {
                  const values = (field.value as string[]) || [];
                  const isChecked = values.includes(option.value);

                  return (
                    <div key={option.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`${element.id}_${option.value}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            field.onChange([...values, option.value]);
                          } else {
                            field.onChange(
                              values.filter((v) => v !== option.value)
                            );
                          }
                        }}
                      />
                      <Label
                        htmlFor={`${element.id}_${option.value}`}
                        className="font-normal cursor-pointer"
                      >
                        {option.label}
                      </Label>
                    </div>
                  );
                })}
              </div>
            )}
          />
        </FormField>
      );

    case "heading":
      return (
        <h3 className="text-lg font-semibold mt-4 mb-2">{element.label}</h3>
      );

    case "paragraph":
      return (
        <p className="text-sm text-muted-foreground mb-4">{element.label}</p>
      );

    case "divider":
      return <Separator className="my-4" />;

    case "image":
      // Image element - placeholder for now
      return (
        <div className="my-4 p-4 border rounded-lg bg-muted/30 text-center text-sm text-muted-foreground">
          [Image: {element.label || "No image configured"}]
        </div>
      );

    default:
      return null;
  }
}

interface FormFieldProps {
  element: FormElement;
  error?: string;
  children: React.ReactNode;
}

function FormField({ element, error, children }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={element.id}>
        {element.label}
        {element.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
      {element.helpText && (
        <p className="text-xs text-muted-foreground">{element.helpText}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function FormRenderer({
  elements,
  onSubmit,
  defaultValues,
  submitButtonText = "Submit",
  showSubmitButton = true,
  className,
}: FormRendererProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    defaultValues,
  });

  // Sort elements by position
  const sortedElements = [...elements].sort((a, b) => a.position - b.position);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn("space-y-4", className)}
    >
      {sortedElements.map((element) => (
        <ElementRenderer
          key={element.id}
          element={element}
          register={register}
          control={control}
          errors={errors}
        />
      ))}

      {showSubmitButton && (
        <Button type="submit" className="w-full">
          {submitButtonText}
        </Button>
      )}
    </form>
  );
}
