"use client"

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
} from "recharts"

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card"

import {
    ChartContainer,
    ChartTooltipContent
} from "@/components/ui/chart"

const chartData = [
    { label: "A", data: 275, fill: "#93C5FD" },
    { label: "B", data: 200, fill: "#60A5FA" },
    { label: "C", data: 187, fill: "#3B82F6" },
    { label: "D", data: 173, fill: "#2563EB" },
    { label: "E", data: 90, fill: "#1D4ED8" },
]

const chartMeta = {
    chartType: "line",
    labels: chartData.map((d) => d.label),
    values: chartData.map((d) => d.data),
    colors: chartData.map((d) => d.fill),
    legendColor: '#1D4ED8',
    lableColor: '#1D4ED8',
}

function ChartLine({ title }: { title: string }) {
    return (
        <Card className="flex flex-col">
            <CardHeader className="items-center pb-0">
                <CardTitle>{title}</CardTitle>
            </CardHeader>

            <CardContent className="flex-1 pb-0">
                <ChartContainer
                    config={{}}
                    className="mx-auto h-[250px] w-full"
                >
                    <LineChart
                        data={chartData}
                        data-chart={JSON.stringify(chartMeta)}
                        data-chart-type="line"
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <RechartsTooltip content={<ChartTooltipContent hideLabel />} />
                        <Line
                            type="monotone"
                            dataKey="data"
                            stroke="#3B82F6"
                            strokeWidth={3}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}

export default ChartLine