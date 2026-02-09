import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/design/components/ui/card";
import { FileText } from "lucide-react";

const demos = [
  {
    title: "Form Builder",
    description: "Drag-and-drop form builder with multi-page support. Build forms with 14 element types.",
    href: "/demo/form-builder",
    icon: FileText,
  },
];

export default function DemoIndexPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Component Demos</h1>
        <p className="text-muted-foreground mt-2">
          Proof of concept demonstrations for built components.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {demos.map((demo) => (
          <Link key={demo.href} href={demo.href}>
            <Card className="h-full hover:border-primary transition-colors cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <demo.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{demo.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{demo.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
