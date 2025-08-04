"use client"

import { Pie, PieChart } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface ChartProps {
    title: string;
}

const chartData = [
    { browser: "A", data: 275, fill: "#93C5FD" },
    { browser: "B", data: 200, fill: "#60A5FA" },
    { browser: "C", data: 187, fill: "#3B82F6" },
    { browser: "D", data: 173, fill: "#2563EB" },
    { browser: "E", data: 90, fill: "#1D4ED8" },
];

function Chart({ title }: ChartProps) {
    return (
        <Card className="flex flex-col chart-snapshot">
            <CardHeader className="items-center pb-0">
                <CardTitle>{title}</CardTitle>
            </CardHeader>

            <CardContent className="flex-1 pb-0">
                <ChartContainer
                    config={{}}
                    className="mx-auto aspect-square max-h-[250px]"
                >
                    <PieChart>
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel />}
                        />
                        <Pie
                            data={chartData}
                            dataKey="data"
                            nameKey="browser"
                            cx="50%"
                            cy="50%"
                            outerRadius="80%"
                            label
                        />
                    </PieChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}

export default Chart;