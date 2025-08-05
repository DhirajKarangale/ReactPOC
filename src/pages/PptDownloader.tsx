"use client"

import React, { useEffect, useRef, useState } from "react"
import { toPng } from "html-to-image"
import PptxGenJS from "pptxgenjs"
import { oklch as parseOKLCH, formatHex } from 'culori'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"

interface PptDownloadProps {
    isOpen: boolean
    onClose: () => void
    contentRef: React.RefObject<HTMLDivElement | null>
}

const PptDownloader: React.FC<PptDownloadProps> = ({ isOpen, onClose, contentRef }) => {
    const [title, setTitle] = useState("CX Dashboard Info")
    const [previewImage, setPreviewImage] = useState<string | null>(null)
    const previewRef = useRef<HTMLDivElement>(null)


    function pxToIn(px: number): number {
        return px / 96;
    }

    function parseCssColorToHex(cssColor: string): string {
        try {
            if (cssColor.startsWith("oklch(")) {
                const match = cssColor.match(/oklch\(([^)]+)\)/);
                if (match) {
                    const [l, c, h] = match[1].trim().split(/\s+/).map(Number);
                    const color = parseOKLCH({ mode: "oklch", l, c, h });
                    return formatHex(color);
                }
            }

            const ctx = document.createElement("canvas").getContext("2d");
            if (!ctx) return "#000000";

            ctx.fillStyle = cssColor;
            const computed = ctx.fillStyle;

            const rgbMatch = computed.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
            if (rgbMatch) {
                const [_, r, g, b] = rgbMatch;
                return (
                    "#" +
                    [r, g, b]
                        .map((x) => {
                            const hex = parseInt(x).toString(16);
                            return hex.length === 1 ? "0" + hex : hex;
                        })
                        .join("")
                );
            }

            return computed;
        } catch (e) {
            console.warn("Failed to convert color:", cssColor);
            return "#000000";
        }
    }

    function getElementInfo(el: HTMLElement, rootRect: DOMRect) {
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();

        return {
            tag: el.tagName,
            text: el.innerText || "",
            x: rect.left - rootRect.left,
            y: rect.top - rootRect.top,
            width: rect.width,
            height: rect.height,
            styles: {
                backgroundColor: parseCssColorToHex(style.backgroundColor),
                color: parseCssColorToHex(style.color),
                fontSize: parseInt(style.fontSize),
                fontWeight: style.fontWeight,
                borderRadius: style.borderRadius,
                textAlign: style.textAlign,
            },
        };
    }

    async function handleDownload() {
        if (!contentRef.current) return;

        const root = contentRef.current;
        const ppt = new PptxGenJS();
        const slide = ppt.addSlide();
        const rootRect = root.getBoundingClientRect();

        const allNodes = root.querySelectorAll("*");
        for (const el of allNodes) {
            if (!(el instanceof HTMLElement)) continue;
            if (el.closest('.no-print')) continue;

            const info = getElementInfo(el, rootRect);
            if (!info.text.trim()) continue;

            slide.addText(info.text, {
                x: pxToIn(info.x),
                y: pxToIn(info.y),
                w: pxToIn(info.width),
                h: pxToIn(info.height),
                fontSize: info.styles.fontSize || 12,
                color: info.styles.color || "#000000",
                fill: info.styles.backgroundColor !== "rgba(0, 0, 0, 0)"
                    ? { color: info.styles.backgroundColor }
                    : undefined,
                bold: info.styles.fontWeight === "bold" || parseInt(info.styles.fontWeight) >= 600,
                align: info.styles.textAlign as any,
            });
        }

        ppt.writeFile({ fileName: `${title}.pptx` });
    }


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