"use client"

import React, { useEffect, useRef, useState } from "react"
import { toPng } from "html-to-image"
import PptxGenJS from "pptxgenjs"
import { oklch as parseOKLCH, formatHex } from "culori"

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
    const bgColor = "#F5F5F5";

    const parseCssColorToHex = (cssColor: string): string => {
        try {
            if (cssColor.startsWith("oklch(")) {
                const match = cssColor.match(/oklch\(([^)]+)\)/)
                if (match) {
                    const [l, c, h] = match[1].trim().split(/\s+/).map(Number)
                    const color = parseOKLCH({ mode: "oklch", l, c, h })
                    return formatHex(color)
                }
            }

            const ctx = document.createElement("canvas").getContext("2d")
            if (!ctx) return "#000000"
            ctx.fillStyle = cssColor
            return ctx.fillStyle
        } catch {
            return "#000000"
        }
    }

    const getElementInfo = (el: HTMLElement, rootRect: DOMRect, pxToInX: (px: number) => number, pxToInY: (px: number) => number) => {
        const style = getComputedStyle(el)
        const rect = el.getBoundingClientRect()

        return {
            text: el.innerText || "",
            x: pxToInX(rect.left - rootRect.left),
            y: pxToInY(rect.top - rootRect.top),
            w: pxToInX(rect.width),
            h: pxToInY(rect.height),
            styles: {
                backgroundColor: parseCssColorToHex(style.backgroundColor),
                color: parseCssColorToHex(style.color),
                fontSize: parseInt(style.fontSize),
                fontWeight: style.fontWeight,
                textAlign: style.textAlign,
                borderColor: parseCssColorToHex(style.borderColor),
                borderWidth: style.borderWidth,
                margin: style.margin,
                padding: style.padding,
                borderRadius: style.borderRadius,
            },
        }
    }

    const getLowestUniqueElement = (root: HTMLElement, text: string, uid: string): HTMLElement | null => {
        const candidates = Array.from(root.querySelectorAll("*")).filter(
            el => el instanceof HTMLElement && el.textContent?.includes(text)
        ) as HTMLElement[]

        const uidNum = uid.split('-')[1];
        candidates.sort((a, b) => b.querySelectorAll("*").length - a.querySelectorAll("*").length)

        for (const el of candidates) {
            const elUid = el.getAttribute("data-uid")?.split('-')[1];
            if (!elUid || elUid < uidNum) continue;

            const children = Array.from(el.querySelectorAll("*"))
            const hasChildWithSameText = children.some(child => child.textContent?.trim() === text.trim())

            if (!hasChildWithSameText) {
                return el
            }
        }

        return null
    }

    const assignElementUIDs = (root: HTMLElement) => {
        Array.from(root.querySelectorAll("*")).forEach((el, idx) => {
            if (el instanceof HTMLElement) {
                el.setAttribute("data-uid", `el-${idx}`)
            }
        })
    }

    const hasVisualStyle = (style: CSSStyleDeclaration) => {
        return (
            style.backgroundColor && style.backgroundColor !== "rgba(0, 0, 0, 0)" ||
            parseInt(style.borderWidth || "0") > 0 ||
            parseInt(style.padding || "0") > 0
        )
    }

    const handleDownload = async () => {
        if (!contentRef.current) return

        const root = contentRef.current
        const rootRect = root.getBoundingClientRect()
        const rootWidth = rootRect.width
        const rootHeight = rootRect.height

        const sizeX = 14.4;
        const sizeY = 14.58;
        // const sizeY = 8.1;

        const scaleX = sizeX / rootWidth
        const scaleY = sizeY / rootHeight

        const pxToInX = (px: number) => px * scaleX;
        const pxToInY = (px: number) => px * scaleY;

        const ppt = new PptxGenJS()
        ppt.defineLayout({ name: "Custom", width: sizeX, height: sizeY })
        ppt.layout = "Custom"
        const slide = ppt.addSlide();
        slide.background = { fill: bgColor };

        slide.addText(title, {
            x: 0,
            y: 0.3,
            w: sizeX,
            h: 1,
            fontSize: 28,
            bold: true,
            align: "center",
            color: "#000000",
        });

        assignElementUIDs(root)

        const allNodes = Array.from(root.querySelectorAll("*"))

        const textNodes: HTMLElement[] = [];
        const renderedUIDs = new Set<string>();

        for (const el of allNodes) {
            if (!(el instanceof HTMLElement)) continue;
            if (el.closest(".no-print")) continue;

            const text = el.innerText.trim();
            if (!text) continue;

            const uid = el.getAttribute("data-uid");
            if (!uid || renderedUIDs.has(uid)) continue;

            const target = getLowestUniqueElement(root, text, uid);
            if (!target) continue;

            const targetUID = target.getAttribute("data-uid");
            if (!targetUID || renderedUIDs.has(targetUID)) continue;

            textNodes.push(target);
            renderedUIDs.add(targetUID);
        }

        const shapeUIDs = new Set<string>();

        const commonAncestor = (nodes: HTMLElement[]) => {
            if (nodes.length === 0) return null;
            let current = nodes[0].parentElement;
            while (current) {
                if (nodes.every(n => current?.contains(n))) return current;
                current = current.parentElement;
            }
            return null;
        };

        const outermostWrapper = commonAncestor(textNodes);

        for (const el of allNodes.reverse()) {
            if (!(el instanceof HTMLElement)) continue;

            const uid = el.getAttribute("data-uid");
            if (!uid || shapeUIDs.has(uid)) continue;

            if (el.closest(".no-print")) continue;

            if (el === outermostWrapper) continue;

            const style = getComputedStyle(el);
            if (!hasVisualStyle(style)) continue;

            const containsTextChild = textNodes.some(textEl => el.contains(textEl));
            if (!containsTextChild) continue;

            const info = getElementInfo(el, rootRect, pxToInX, pxToInY);
            if (!info) continue;

            const isRounded = parseInt(info.styles.borderRadius || "0") > 0;

            // const borderWidth = parseInt(info.styles.borderWidth || "0");
            // const borderColor = info.styles.borderColor?.toLowerCase();
            // const showBorder = borderWidth > 0 && borderColor !== "transparent" && borderColor !== "rgba(0, 0, 0, 0)";

            const borderColor = info.styles.borderColor?.toLowerCase();
            const borderWidth = parseInt(info.styles.borderWidth || "0");
            const showBorder2 = borderWidth > 0 && borderColor !== "#00000000" && borderColor !== "transparent" && borderColor !== "#000000";

            slide.addShape(ppt.ShapeType.roundRect, {
                x: info.x,
                y: info.y,
                w: info.w,
                h: info.h,
                fill: info.styles.backgroundColor !== "#00000000"
                    ? { color: info.styles.backgroundColor }
                    : undefined,
                ...(showBorder2 && {
                    line: {
                        color: info.styles.borderColor,
                        width: borderWidth,
                    },
                }),
            });

            shapeUIDs.add(uid);
        }

        for (const el of textNodes) {
            const info = getElementInfo(el, rootRect, pxToInX, pxToInY);
            if (!info.text.trim()) continue;

            slide.addText(info.text, {
                x: info.x,
                y: info.y,
                w: info.w,
                h: info.h,
                fontSize: info.styles.fontSize || 12,
                color: info.styles.color || "#000000",
                fill: info.styles.backgroundColor !== "rgba(0, 0, 0, 0)" ? { color: info.styles.backgroundColor } : undefined,
                bold: info.styles.fontWeight === "bold" || parseInt(info.styles.fontWeight) >= 600,
                align: info.styles.textAlign as any,
                line: {
                    color: info.styles.borderColor || "transparent",
                    width: info.styles.borderWidth ? parseInt(info.styles.borderWidth) : 0,
                },
                margin: parseInt(info.styles.padding) || 0,
            });
        }

        ppt.writeFile({ fileName: `${title}.pptx` })
    }

    const preparePreview = async () => {
        if (!contentRef.current) return

        const originalNode = contentRef.current
        const clone = originalNode.cloneNode(true) as HTMLElement
        clone.querySelectorAll(".no-print").forEach(el => el.remove())

        const charts = originalNode.querySelectorAll(".chart-snapshot")
        const clonedCharts = clone.querySelectorAll(".chart-snapshot")

        await Promise.all(
            Array.from(charts).map(async (chart, i) => {
                const cloneTarget = clonedCharts[i] as HTMLElement | undefined
                if (!cloneTarget) return

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

    useEffect(() => {
        if (!isOpen) return
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
                                <img src={previewImage} alt="preview" className="w-full h-auto rounded shadow" />
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
