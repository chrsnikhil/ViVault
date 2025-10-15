import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ComponentGallery() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card className="rounded-2xl bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/90 border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.15)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.2)] transition-all duration-300">
        <CardHeader>
          <CardTitle>Loan Calculator</CardTitle>
          <CardDescription>See what you can borrow</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-2xl font-bold">$5,000 - $50,000</div>
            <p className="text-sm text-muted-foreground">Based on your business needs</p>
            <Button className="w-full">Calculate Now</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/90 border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.15)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.2)] transition-all duration-300">
        <CardHeader>
          <CardTitle>Quick Application</CardTitle>
          <CardDescription>Start your loan process</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-2xl font-bold">5 minutes</div>
            <p className="text-sm text-muted-foreground">Simple form, fast approval</p>
            <Button className="w-full" variant="outline">
              Start Application
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/90 border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.15)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.2)] transition-all duration-300">
        <CardHeader>
          <CardTitle>Success Stories</CardTitle>
          <CardDescription>Real customer experiences</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-2xl font-bold">4.9/5</div>
            <p className="text-sm text-muted-foreground">Customer satisfaction rating</p>
            <Button className="w-full" variant="outline">
              Read Stories
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
