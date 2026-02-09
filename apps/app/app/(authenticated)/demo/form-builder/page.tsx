"use client";

import { useState } from "react";
import {
  FormBuilder,
  createEmptyFormConfig,
  type FormConfig,
} from "@repo/design/components/form-builder";
import { Button } from "@repo/design/components/ui/button";

export default function FormBuilderDemoPage() {
  const [config, setConfig] = useState<FormConfig>(() =>
    createEmptyFormConfig("demo_task_1")
  );
  const [showJson, setShowJson] = useState(false);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex-shrink-0 border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Form Builder Demo</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Drag elements from the palette to build your form. Click to select, drag to reorder.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowJson(!showJson)}
            >
              {showJson ? "Hide" : "Show"} JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfig(createEmptyFormConfig("demo_task_1"))}
            >
              Reset
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Form Builder */}
        <div className={showJson ? "w-2/3" : "w-full"}>
          <FormBuilder
            config={config}
            onConfigChange={setConfig}
            className="h-full"
          />
        </div>

        {/* JSON Preview */}
        {showJson && (
          <div className="w-1/3 border-l bg-muted/30 p-4 overflow-auto">
            <h3 className="text-sm font-medium mb-2">Form Config JSON</h3>
            <pre className="text-xs bg-background p-4 rounded-lg overflow-auto">
              {JSON.stringify(config, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
