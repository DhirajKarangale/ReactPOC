import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, type ChartOptions } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface ChartProps {
    title?: string;
}

function Chart({ title }: ChartProps) {
    const chartData = {
        labels: ['Data1', 'Data2', 'Data3', 'Data4', 'Data5'],
        datasets: [
            {
                data: Array.from({ length: 5 }, () => Math.floor(Math.random() * 100) + 10),
                backgroundColor: ['#60a5fa', '#f87171', '#34d399', '#fbbf24', '#a78bfa'],
                borderWidth: 1,
            },
        ],
    };

    const options: ChartOptions<'pie'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
            },
            title: {
                display: true,
                text: title || 'Chart Title',
                font: {
                    size: 16,
                    weight: 'bold',
                },
            },
        },
    };

    return (
        <div className="w-full h-full bg-white rounded-lg shadow-md p-4 flex items-center justify-center">
            <div className="w-full h-full">
                <Pie data={chartData} options={options} />
            </div>
        </div>
    );
};

export default Chart;