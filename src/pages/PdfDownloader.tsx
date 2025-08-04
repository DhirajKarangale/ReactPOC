import React, { useState, useEffect } from "react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

interface PdfDownloadModalProps {
    isOpen: boolean;
    onClose: () => void;
    contentRef: React.RefObject<HTMLDivElement | null>;
}

const PdfDownloader: React.FC<PdfDownloadModalProps> = ({ isOpen, onClose, contentRef }) => {
    const [cleanedContent, setCleanedContent] = useState<string>("");
    const [title, setTitle] = useState<string>("CX Dashboard Info DK");
    const bgColor = 'white';

    const IMAGE_OPTIONS = {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: bgColor,
    };

    // async function handleDownload() {
    //     if (!contentRef.current) return;

    //     const noPrintElements = contentRef.current.querySelectorAll(".no-print");
    //     noPrintElements.forEach((el) => ((el as HTMLElement).style.opacity = "0"));

    //     try {
    //         const dataUrl = await toPng(contentRef.current, IMAGE_OPTIONS);

    //         const pdf = new jsPDF({
    //             orientation: "portrait",
    //             unit: "px",
    //             format: "a4",
    //         });

    //         const currentTitle = title;
    //         const pageWidth = pdf.internal.pageSize.getWidth();
    //         const pageHeight = pdf.internal.pageSize.getHeight();

    //         pdf.setFillColor(bgColor);
    //         pdf.rect(0, 0, pageWidth, pageHeight, "F");

    //         const img = new Image();
    //         img.src = dataUrl;

    //         img.onload = () => {
    //             const ratio = Math.min(pageWidth / img.width, pageHeight / img.height);
    //             const scaledWidth = img.width * ratio;
    //             const scaledHeight = img.height * ratio;
    //             const x = (pageWidth - scaledWidth) / 2;
    //             const y = 50;

    //             pdf.setTextColor(0, 0, 0);
    //             pdf.setFont("helvetica", "bold");
    //             pdf.setFontSize(20);
    //             pdf.text(currentTitle, pageWidth / 2, 30, { align: "center" });

    //             pdf.addImage(dataUrl, "PNG", x, y, scaledWidth, scaledHeight);
    //             pdf.save("dashboard.pdf");
    //         };
    //     } catch (err) {
    //         console.error("Error generating PDF", err);
    //     } finally {
    //         noPrintElements.forEach((el) => ((el as HTMLElement).style.opacity = ""));
    //         onClose();
    //     }
    // }


    const handleDownload = async () => {
        if (!contentRef.current) return;

        try {
            const originalNode = contentRef.current;
            const clone = originalNode.cloneNode(true) as HTMLElement;

            clone.querySelectorAll(".no-print").forEach((el) => el.remove());

            const originalCharts = originalNode.querySelectorAll(".chart-snapshot");
            const clonedCharts = clone.querySelectorAll(".chart-snapshot");

            await Promise.all(
                Array.from(originalCharts).map(async (chartEl, i) => {
                    const cloneEl = clonedCharts[i] as HTMLElement;

                    try {
                        const dataUrl = await toPng(chartEl as HTMLElement, { cacheBust: true });

                        const img = new Image();
                        img.src = dataUrl;
                        img.style.width = "100%";
                        img.style.borderRadius = "inherit";
                        img.style.boxShadow = "inherit";

                        await img.decode();

                        cloneEl.innerHTML = "";
                        cloneEl.appendChild(img);
                    } catch (err) {
                        console.warn("Failed to render chart image", err);
                    }
                })
            );

            const hiddenWrapper = document.createElement("div");
            hiddenWrapper.style.position = "fixed";
            hiddenWrapper.style.top = "-10000px";
            hiddenWrapper.style.left = "-10000px";
            hiddenWrapper.style.zIndex = "-999";
            hiddenWrapper.style.pointerEvents = "none";
            hiddenWrapper.appendChild(clone);
            document.body.appendChild(hiddenWrapper);

            const finalDataUrl = await toPng(clone, {
                backgroundColor: "#ffffff",
                cacheBust: true,
            });

            document.body.removeChild(hiddenWrapper);

            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "px",
                format: "a4",
            });

            const img = new Image();
            img.src = finalDataUrl;

            img.onload = () => {
                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();

                const ratio = Math.min(pageWidth / img.width, pageHeight / img.height);
                const scaledWidth = img.width * ratio;
                const scaledHeight = img.height * ratio;

                const x = (pageWidth - scaledWidth) / 2;
                const y = 50;

                pdf.setFillColor("#ffffff");
                pdf.rect(0, 0, pageWidth, pageHeight, "F");

                pdf.setTextColor(0, 0, 0);
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(20);
                pdf.text(title, pageWidth / 2, 30, { align: "center" });

                pdf.addImage(finalDataUrl, "PNG", x, y, scaledWidth, scaledHeight);
                pdf.save("dashboard.pdf");
            };

            img.onerror = () => {
                throw new Error("Image loading failed");
            };
        } catch (err) {
            console.error("Error generating PDF", err);
        }
    };

    useEffect(() => {
        if (!isOpen || !contentRef.current) return;

        let isMounted = true;

        const generatePreview = async () => {
            const source = contentRef.current!;
            const clonedNode = source.cloneNode(true) as HTMLElement;

            clonedNode.querySelectorAll(".no-print").forEach((el) => el.remove());

            const originalCharts = source.querySelectorAll(".chart-snapshot");
            const clonedCharts = clonedNode.querySelectorAll(".chart-snapshot");

            await Promise.all(
                Array.from(originalCharts).map(async (chartEl, index) => {
                    try {
                        const dataUrl = await toPng(chartEl as HTMLElement, IMAGE_OPTIONS);

                        const img = new Image();
                        img.src = dataUrl;
                        img.style.width = "100%";
                        img.style.borderRadius = "inherit";
                        img.style.boxShadow = "inherit";

                        const target = clonedCharts[index];
                        target.innerHTML = "";
                        target.appendChild(img);
                    } catch (err) {
                        console.warn("Chart conversion failed", err);
                    }
                })
            );

            if (isMounted) {
                setCleanedContent(clonedNode.innerHTML);
            }
        };

        generatePreview();

        return () => { isMounted = false; };
    }, [isOpen, contentRef]);

    if (!isOpen || !contentRef || !contentRef.current) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10">
            <div className="bg-white/10 w-full h-full sm:w-[80%] sm:h-[90%] rounded-lg overflow-hidden shadow-lg flex flex-col">
                <div className="p-4 border-b relative flex items-center justify-between">
                    <h2 className="text-xl font-bold">Preview</h2>
                    <div className="absolute left-1/2 -translate-x-1/2">
                        <input
                            type="text"
                            placeholder="Enter PDF title..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-black text-sm"
                        />
                    </div>
                </div>

                <div className="flex-1 items-start justify-center overflow-auto p-1">
                    <div className="scale-[0.7] origin-top print-preview pt-2">
                        {cleanedContent ? (
                            <div dangerouslySetInnerHTML={{ __html: cleanedContent }} />
                        ) : (
                            <div className="text-center text-sm text-gray-500">
                                Generating preview…
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t flex flex-col sm:flex-row justify-between items-center bg-white gap-3 sm:gap-0">
                    <button
                        className="w-full sm:w-auto px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 transition"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        className="w-full sm:w-auto px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
                        onClick={handleDownload}
                    >
                        Download PDF
                    </button>
                </div>

            </div>
        </div>
    );
};

export default PdfDownloader;
