"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function InfoBox({ title }: { title: string }) {
    const items = [
        "Lorem ipsum dolor sit amet consectetur adipisicing elit. Consequatur, harum ex.",
        "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Error, delectus.",
        "Lorem ipsum dolor sit amet consectetur adipisicing elit. Molestias sed unde tenetur hic",
        "Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptatibus, totam.",
    ];

    const colors = [
        "border-l-4 border-blue-500",
        "border-l-4 border-green-500",
        "border-l-4 border-yellow-500",
        "border-l-4 border-red-500",
    ];

    return (
        <Card className="w-full max-w-xl mx-auto">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                {items.map((item, index) => (
                    <div
                        key={index}
                        className={`p-4 bg-muted text-muted-foreground rounded-md text-sm leading-relaxed ${colors[index % colors.length]}`}
                    >
                        {item}
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

export default InfoBox;