import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calculator, FileText, Star, ArrowRight, Clock } from 'lucide-react';

export default function ComponentGallery() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      <Card className="border shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="px-6 py-6 pb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-10 rounded-md bg-primary/10 flex items-center justify-center">
              <Calculator className="size-5 text-primary" />
            </div>
            <CardTitle className="text-lg">Loan Calculator</CardTitle>
          </div>
          <CardDescription>See what you can borrow</CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-6 space-y-4">
          <div className="text-3xl font-semibold text-foreground">$5,000 - $50,000</div>
          <p className="text-muted-foreground">Based on your business needs and cash flow</p>
          <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring/50 focus-visible:ring-[3px]">
            Calculate Now
            <ArrowRight className="size-4 ml-2" />
          </Button>
        </CardContent>
      </Card>

      <Card className="border shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="px-6 py-6 pb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-10 rounded-md bg-primary/10 flex items-center justify-center">
              <FileText className="size-5 text-primary" />
            </div>
            <CardTitle className="text-lg">Quick Application</CardTitle>
          </div>
          <CardDescription>Start your loan process</CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-6 space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              <Clock className="size-3 mr-1" />5 minutes
            </Badge>
          </div>
          <p className="text-muted-foreground">Simple form, fast approval process</p>
          <Button
            className="w-full border-input hover:bg-accent focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            variant="outline"
          >
            Start Application
          </Button>
        </CardContent>
      </Card>

      <Card className="border shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="px-6 py-6 pb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-10 rounded-md bg-primary/10 flex items-center justify-center">
              <Star className="size-5 text-primary" />
            </div>
            <CardTitle className="text-lg">Success Stories</CardTitle>
          </div>
          <CardDescription>Real customer experiences</CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-6 space-y-4">
          <div className="flex items-center gap-2">
            <div className="text-3xl font-semibold text-foreground">4.9</div>
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="size-4 fill-primary text-primary" />
              ))}
            </div>
          </div>
          <p className="text-muted-foreground">Customer satisfaction rating</p>
          <Button
            className="w-full border-input hover:bg-accent focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            variant="outline"
          >
            Read Stories
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
