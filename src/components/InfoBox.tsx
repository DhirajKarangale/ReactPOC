interface InfoBoxProps {
    title: string;
}

function InfoBox({ title }: InfoBoxProps) {
    const items = [
        'Lorem ipsum dolor sit amet consectetur adipisicing elit. Consequatur, harum ex.',
        'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Error, delectus.',
        'Lorem ipsum dolor sit amet consectetur adipisicing elit. Molestias sed unde tenetur hic',
        'Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptatibus, totam.',
    ];

    const colors = ['border-blue-500', 'border-green-500', 'border-yellow-500', 'border-red-500'];

    return (
        <div className="w-full max-w-xl mx-auto p-4 bg-white rounded-lg shadow-md">
            <h2 className="text-lg font-semibold mb-4">{title}</h2>
            <div className="flex flex-col gap-4">
                {items.map((item, index) => (
                    <div
                        key={index}
                        className={`p-4 bg-gray-100 rounded-md text-gray-800 text-sm leading-relaxed border-l-4 pl-4 ${colors[index % colors.length]}`}>
                        {item}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default InfoBox;