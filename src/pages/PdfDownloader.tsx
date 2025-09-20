"use client"

import React, { useEffect, useState, useRef, type MutableRefObject } from "react"
import { toPng } from "html-to-image"
import jsPDF from "jspdf"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"

interface PdfDownloaderProps {
    isOpen: boolean
    onClose: () => void
    contentRef: MutableRefObject<HTMLDivElement | null>
}

function PdfDownloader({ isOpen, onClose, contentRef }: PdfDownloaderProps) {
    const [cleanedContent, setCleanedContent] = useState<string>("")
    const [title, setTitle] = useState<string>("PDF Title")
    const previewRef = useRef<HTMLDivElement | null>(null)
    const [scale, setScale] = useState<number>(1)
    const bgColor = "#ffffff"

    const IMAGE_OPTIONS = {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: bgColor,
    }

    useEffect(() => {
        if (!isOpen || !contentRef.current || !previewRef.current) return

        const originalWidth = contentRef.current.offsetWidth
        const previewWidth = previewRef.current.offsetWidth

        if (originalWidth > 0 && previewWidth > 0) {
            const computedScale = previewWidth / originalWidth
            setScale(Math.min(1, computedScale))
        }
    }, [isOpen, cleanedContent]);


    const getFormattedDate = () => {
        const now = new Date()
        const day = String(now.getDate()).padStart(2, "0")
        const month = String(now.getMonth() + 1).padStart(2, "0")
        const year = now.getFullYear()
        return `${day}/${month}/${year}`
    }

    async function handleDownload() {
        if (!contentRef.current) return

        try {
            const originalNode = contentRef.current;
            const clone = originalNode.cloneNode(true) as HTMLElement;

            clone.querySelectorAll(".no-print").forEach((el) => el.remove());

            const originalCharts = originalNode.querySelectorAll(".chart-snapshot");
            const clonedCharts = clone.querySelectorAll(".chart-snapshot");

            await Promise.all(
                Array.from(originalCharts).map(async (chartEl, i) => {
                    const cloneEl = clonedCharts[i];
                    try {
                        const dataUrl = await toPng(chartEl as HTMLElement, {
                            cacheBust: true,
                            backgroundColor: bgColor,
                        })

                        const img = new Image()
                        img.src = dataUrl
                        img.style.width = "100%"
                        img.style.borderRadius = "inherit"
                        img.style.boxShadow = "inherit"

                        await img.decode()
                        cloneEl.innerHTML = ""
                        cloneEl.appendChild(img)
                    } catch (err) {
                        console.warn("Failed to render chart image", err)
                    }
                })
            )

            const hiddenWrapper = document.createElement("div")
            hiddenWrapper.style.position = "fixed"
            hiddenWrapper.style.top = "-10000px"
            hiddenWrapper.style.left = "-10000px"
            hiddenWrapper.style.zIndex = "-999"
            hiddenWrapper.style.pointerEvents = "none"
            hiddenWrapper.appendChild(clone)
            document.body.appendChild(hiddenWrapper)

            const finalDataUrl = await toPng(clone, {
                backgroundColor: bgColor,
                cacheBust: true,
            })

            document.body.removeChild(hiddenWrapper)

            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "px",
                format: "a4",
            })

            const img = new Image()
            img.src = finalDataUrl

            img.onload = () => {
                const pageWidth = pdf.internal.pageSize.getWidth()
                const pageHeight = pdf.internal.pageSize.getHeight()

                const ratio = Math.min(pageWidth / img.width, pageHeight / img.height)
                const scaledWidth = img.width * ratio
                const scaledHeight = img.height * ratio

                const x = (pageWidth - scaledWidth) / 2
                const y = 40

                const dateStr = getFormattedDate()

                pdf.setFillColor(bgColor)
                pdf.rect(0, 0, pageWidth, pageHeight, "F")

                pdf.setTextColor(0, 0, 0)

                pdf.setFont("helvetica", "bold")
                pdf.setFontSize(20)
                pdf.text(title.trim(), 20, 30)

                pdf.setTextColor(100, 100, 100)
                pdf.setFont("helvetica", "normal")
                pdf.setFontSize(10)
                pdf.text(dateStr, pageWidth - 20, 30, { align: "right" })

                pdf.setDrawColor(180)
                pdf.setLineWidth(0.5)
                pdf.line(20, 36, pageWidth - 20, 36)

                pdf.addImage(finalDataUrl, "PNG", x, y, scaledWidth, scaledHeight)
                pdf.save(`${title.trim()}.pdf`)
            }

            img.onerror = () => { throw new Error("Image loading failed") }
        } catch (err) {
            console.log("Error generating PDF", err)
        }
    }

    useEffect(() => {
        if (!isOpen || !contentRef.current) return
        let isMounted = true

        const generatePreview = async () => {
            const source = contentRef.current;
            if (!source) return;

            const clonedNode = source.cloneNode(true) as HTMLElement;

            clonedNode.querySelectorAll(".no-print").forEach((el) => el.remove());

            const originalCharts = source.querySelectorAll(".chart-snapshot");
            const clonedCharts = clonedNode.querySelectorAll(".chart-snapshot");

            await Promise.all(
                Array.from(originalCharts).map(async (chartEl, index) => {
                    try {
                        const dataUrl = await toPng(chartEl as HTMLElement, IMAGE_OPTIONS)

                        const img = new Image()
                        img.src = dataUrl
                        img.style.width = "100%"
                        img.style.borderRadius = "inherit"
                        img.style.boxShadow = "inherit"

                        const target = clonedCharts[index]
                        target.innerHTML = ""
                        target.appendChild(img)
                    } catch (err) {
                        console.warn("Chart conversion failed", err)
                    }
                })
            )

            if (isMounted) {
                setCleanedContent(clonedNode.innerHTML)
            }
        }

        generatePreview()
        return () => {
            isMounted = false
        }
    }, [isOpen, contentRef])

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="!w-[1000px] !max-w-[95vw] max-h-[95vh] overflow-hidden">
                <DialogHeader>
                    <DialogTitle>Download Dashboard PDF</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-4">
                    <Input
                        placeholder="Enter PDF title..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />

                    <ScrollArea className="border rounded-md p-2 max-h-[60vh] overflow-auto">
                        <div className="pt-2" ref={previewRef}>
                            {cleanedContent ? (
                                <div
                                    style={{
                                        transform: `scale(${scale})`,
                                        transformOrigin: "top left",
                                        width: `${100 / scale}%`,
                                    }}
                                    dangerouslySetInnerHTML={{ __html: cleanedContent }}
                                />
                            ) : (
                                <p className="text-muted-foreground text-sm text-center py-4">
                                    Generating preview...
                                </p>
                            )}
                        </div>
                    </ScrollArea>

                </div>

                <DialogFooter className="gap-2 sm:justify-between pt-2">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleDownload}>Download PDF</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default React.memo(PdfDownloader);