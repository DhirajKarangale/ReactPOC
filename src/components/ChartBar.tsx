"use client"

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Cell
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer } from "@/components/ui/chart"

const chartData = [
    { label: "A", data: 275, fill: "#93C5FD" },
    { label: "B", data: 200, fill: "#60A5FA" },
    { label: "C", data: 187, fill: "#3B82F6" },
    { label: "D", data: 173, fill: "#2563EB" },
    { label: "E", data: 90, fill: "#1D4ED8" },
];

const chartMeta = {
    chartType: "bar",
    labels: chartData.map((d) => d.label),
    values: chartData.map((d) => d.data),
    colors: chartData.map((d) => d.fill),
    legendColor: '#1D4ED8',
    lableColor: '#1D4ED8',
};

function ChartBar({ title }: { title: string }) {
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

                    <BarChart data={chartData}
                        data-chart={JSON.stringify(chartMeta)}
                        data-chart-type="bar">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <Bar dataKey="data">
                            {chartData.map((index) => (<Cell key={`cell-${index}`} />))}
                        </Bar>
                    </BarChart>

                </ChartContainer>
            </CardContent>
        </Card >
    );
}

export default ChartBar;