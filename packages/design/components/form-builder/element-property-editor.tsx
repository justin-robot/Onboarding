"use client";

import React, { useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { type FormElement, type FormElementType } from "./types";

interface ElementPropertyEditorProps {
  element: FormElement | null;
  onElementChange: (element: FormElement) => void;
  className?: string;
}

// Element types that support options
const OPTION_TYPES: FormElementType[] = ["select", "radio", "checkbox"];

// Element types that support text validation
const TEXT_VALIDATION_TYPES: FormElementType[] = [
  "text",
  "textarea",
  "email",
  "phone",
];

// Element types that support number validation
const NUMBER_VALIDATION_TYPES: FormElementType[] = ["number"];

interface OptionEditorProps {
  options: Array<{ label: string; value: string }>;
  onOptionsChange: (options: Array<{ label: string; value: string }>) => void;
}

function OptionEditor({ options, onOptionsChange }: OptionEditorProps) {
  const handleOptionLabelChange = (index: number, label: string) => {
    const newOptions = [...options];
    newOptions[index] = {
      ...newOptions[index],
      label,
      // Auto-generate value from label if it was matching before
      value: label.toLowerCase().replace(/\s+/g, "_"),
    };
    onOptionsChange(newOptions);
  };

  const handleOptionValueChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], value };
    onOptionsChange(newOptions);
  };

  const handleAddOption = () => {
    const newOption = {
      label: `Option ${options.length + 1}`,
      value: `option_${options.length + 1}`,
    };
    onOptionsChange([...options, newOption]);
  };

  const handleRemoveOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index);
    onOptionsChange(newOptions);
  };

  return (
    <div className="space-y-3">
      <Label>Options</Label>
      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={option.label}
              onChange={(e) => handleOptionLabelChange(index, e.target.value)}
              placeholder="Label"
              className="flex-1"
            />
            <Input
              value={option.value}
              onChange={(e) => handleOptionValueChange(index, e.target.value)}
              placeholder="Value"
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => handleRemoveOption(index)}
              disabled={options.length <= 1}
              aria-label="Remove option"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAddOption}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Option
      </Button>
    </div>
  );
}

interface ValidationEditorProps {
  type: FormElementType;
  validation: Record<string, unknown>;
  onValidationChange: (validation: Record<string, unknown>) => void;
}

function ValidationEditor({
  type,
  validation,
  onValidationChange,
}: ValidationEditorProps) {
  const isTextType = TEXT_VALIDATION_TYPES.includes(type);
  const isNumberType = NUMBER_VALIDATION_TYPES.includes(type);

  if (!isTextType && !isNumberType) {
    return null;
  }

  return (
    <div className="space-y-3">
      {isTextType && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="minLength">Min Length</Label>
              <Input
                id="minLength"
                type="number"
                min={0}
                value={(validation.minLength as number) ?? ""}
                onChange={(e) =>
                  onValidationChange({
                    ...validation,
                    minLength: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="maxLength">Max Length</Label>
              <Input
                id="maxLength"
                type="number"
                min={0}
                value={(validation.maxLength as number) ?? ""}
                onChange={(e) =>
                  onValidationChange({
                    ...validation,
                    maxLength: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                placeholder="No limit"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pattern">Pattern (Regex)</Label>
            <Input
              id="pattern"
              value={(validation.pattern as string) ?? ""}
              onChange={(e) =>
                onValidationChange({
                  ...validation,
                  pattern: e.target.value || undefined,
                })
              }
              placeholder="e.g., ^[A-Za-z]+$"
            />
          </div>
        </>
      )}

      {isNumberType && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="min">Minimum</Label>
            <Input
              id="min"
              type="number"
              value={(validation.min as number) ?? ""}
              onChange={(e) =>
                onValidationChange({
                  ...validation,
                  min: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              placeholder="No min"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="max">Maximum</Label>
            <Input
              id="max"
              type="number"
              value={(validation.max as number) ?? ""}
              onChange={(e) =>
                onValidationChange({
                  ...validation,
                  max: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              placeholder="No max"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function ElementPropertyEditor({
  element,
  onElementChange,
  className,
}: ElementPropertyEditorProps) {
  if (!element) {
    return null;
  }

  const handleChange = useCallback(
    (updates: Partial<FormElement>) => {
      onElementChange({ ...element, ...updates });
    },
    [element, onElementChange]
  );

  const supportsOptions = OPTION_TYPES.includes(element.type);
  const supportsValidation =
    TEXT_VALIDATION_TYPES.includes(element.type) ||
    NUMBER_VALIDATION_TYPES.includes(element.type);

  return (
    <div className={cn("space-y-6 p-4", className)}>
      {/* Header */}
      <div>
        <h3 className="font-semibold text-sm">Element Properties</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Type: <span className="capitalize">{element.type}</span>
        </p>
      </div>

      <Separator />

      {/* Basic Properties */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="label">Label</Label>
          <Input
            id="label"
            value={element.label}
            onChange={(e) => handleChange({ label: e.target.value })}
            placeholder="Enter label"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="placeholder">Placeholder</Label>
          <Input
            id="placeholder"
            value={element.placeholder ?? ""}
            onChange={(e) => handleChange({ placeholder: e.target.value })}
            placeholder="Enter placeholder text"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="helpText">Help Text</Label>
          <Input
            id="helpText"
            value={element.helpText ?? ""}
            onChange={(e) => handleChange({ helpText: e.target.value })}
            placeholder="Additional help text"
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="required"
            checked={element.required ?? false}
            onCheckedChange={(checked) =>
              handleChange({ required: checked === true })
            }
          />
          <Label htmlFor="required" className="text-sm font-normal cursor-pointer">
            Required
          </Label>
        </div>
      </div>

      {/* Options (for select, radio, checkbox) */}
      {supportsOptions && element.options && (
        <>
          <Separator />
          <OptionEditor
            options={element.options}
            onOptionsChange={(options) => handleChange({ options })}
          />
        </>
      )}

      {/* Validation */}
      {supportsValidation && (
        <>
          <Separator />
          <div className="space-y-3">
            <Label>Validation</Label>
            <ValidationEditor
              type={element.type}
              validation={element.validation ?? {}}
              onValidationChange={(validation) => handleChange({ validation })}
            />
          </div>
        </>
      )}
    </div>
  );
}
