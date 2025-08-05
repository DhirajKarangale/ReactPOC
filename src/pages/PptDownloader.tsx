"use client"

import React, { useEffect, useRef, useState } from "react"
import { toPng } from "html-to-image"
import PptxGenJS from "pptxgenjs"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"

interface PptDownloadModalProps {
    isOpen: boolean
    onClose: () => void
    contentRef: React.RefObject<HTMLDivElement | null>
}

const PptDownloader: React.FC<PptDownloadModalProps> = ({ isOpen, onClose, contentRef }) => {
    const [title, setTitle] = useState("CX Dashboard Info")
    const [previewImage, setPreviewImage] = useState<string | null>(null)
    const previewRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!isOpen || !contentRef.current) return

        const preparePreview = async () => {
            const originalNode = contentRef.current
            if (!originalNode) return;

            const clone = originalNode.cloneNode(true) as HTMLElement
            clone.querySelectorAll(".no-print").forEach((el) => el.remove())

            const charts = originalNode.querySelectorAll(".chart-snapshot")
            const clonedCharts = clone.querySelectorAll(".chart-snapshot")

            await Promise.all(
                Array.from(charts).map(async (chart, i) => {
                    const cloneTarget = clonedCharts[i] as HTMLElement | undefined
                    if (!cloneTarget) {
                        console.warn(`No matching cloned chart for original chart index ${i}`)
                        return
                    }

                    try {
                        const imgUrl = await toPng(chart as HTMLElement, { cacheBust: true })
                        const img = new Image()
                        img.src = imgUrl
                        await img.decode()
                        cloneTarget.innerHTML = ""
                        cloneTarget.appendChild(img)
                    } catch (err) {
                        console.warn("Chart to image conversion failed", err)
                    }
                })
            )

            const hiddenWrapper = document.createElement("div")
            hiddenWrapper.style.position = "fixed"
            hiddenWrapper.style.top = "-10000px"
            hiddenWrapper.style.left = "-10000px"
            hiddenWrapper.style.zIndex = "-999"
            hiddenWrapper.appendChild(clone)
            document.body.appendChild(hiddenWrapper)

            const image = await toPng(clone, { cacheBust: true })
            setPreviewImage(image)
            document.body.removeChild(hiddenWrapper)
        }

        preparePreview()
    }, [isOpen, contentRef])

    async function handleDownload() {
        if (!previewImage) return

        const pptx = new PptxGenJS()
        const slide = pptx.addSlide()

        slide.addText(title, {
            x: 0.5,
            y: 0.3,
            fontSize: 18,
            bold: true,
        })

        slide.addImage({
            data: previewImage,
            x: 0.5,
            y: 1,
            w: 8,
            h: 5,
        })

        await pptx.writeFile({ fileName: `${title}.pptx` })
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden">
                <DialogHeader>
                    <DialogTitle>Download Dashboard PPT</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-4">
                    <Input
                        placeholder="Enter PPT title..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />

                    <ScrollArea className="border rounded-md p-2 max-h-[60vh] overflow-auto">
                        <div className="pt-2" ref={previewRef}>
                            {previewImage ? (
                                <img
                                    src={previewImage}
                                    alt="preview"
                                    className="w-full h-auto rounded shadow"
                                />
                            ) : (
                                <p className="text-muted-foreground text-sm text-center py-4">
                                    Generating preview...
                                </p>
                            )}
                        </div>
                    </ScrollArea>
                </div>

                <DialogFooter className="gap-2 sm:justify-between pt-4">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleDownload}>Download PPT</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default PptDownloader