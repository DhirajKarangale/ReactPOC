"use client"

import { Pie, PieChart } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const chartData = [
    { label: "A", data: 275, fill: "#93C5FD" },
    { label: "B", data: 200, fill: "#60A5FA" },
    { label: "C", data: 187, fill: "#3B82F6" },
    { label: "D", data: 173, fill: "#2563EB" },
    { label: "E", data: 90, fill: "#1D4ED8" },
];

const chartMeta = {
    chartType: "pie",
    labels: chartData.map((d) => d.label),
    values: chartData.map((d) => d.data),
    colors: chartData.map((d) => d.fill),
    legendColor: '#1D4ED8',
    lableColor: '#1D4ED8',
};

function ChartPie({ title }: { title: string }) {
    return (
        <Card className="flex flex-col">
            <CardHeader className="items-center pb-0">
                <CardTitle>{title}</CardTitle>
            </CardHeader>

            <CardContent className="flex-1 pb-0">
                <ChartContainer
                    config={{}}
                    className="mx-auto aspect-square max-h-[250px]"
                >
                    <PieChart
                        data-chart={JSON.stringify(chartMeta)}
                        data-chart-type="pie">
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel />}
                        />
                        <Pie
                            data={chartData}
                            dataKey="data"
                            nameKey="label"
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

export default ChartPie;