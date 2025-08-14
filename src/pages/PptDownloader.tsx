"use client"

import React, { useEffect, useRef, useState } from "react"
import { toPng } from "html-to-image"
import PptxGenJS from "pptxgenjs"
import { formatHex, parse, converter } from "culori"

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
    const toRgb = converter('rgb');

    interface ComponentGroup {
        background: ReturnType<typeof getElementInfo> | null;
        texts: ReturnType<typeof getElementInfo>[];
        charts: ReturnType<typeof getElementInfo>[];
    }

    const parseCssColorToHex = (cssColor: string): string => {
        if (!cssColor) return "transparent";

        const isTransparent =
            cssColor === "transparent" ||
            cssColor === "rgba(0, 0, 0, 0)" ||
            cssColor === "rgba(255, 255, 255, 0)";

        if (isTransparent) return "transparent";

        try {
            const parsed = parse(cssColor);
            if (!parsed) return "transparent";

            const rgb = toRgb(parsed);
            if (!rgb) return "transparent";

            if ('alpha' in rgb && rgb.alpha !== undefined && rgb.alpha <= 0.1) {
                return "transparent";
            }

            return formatHex(rgb);
        } catch {
            return "transparent";
        }
    };

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
                borderWidth: parseFloat(style.borderWidth || '0'),
                margin: style.margin,
                padding: style.padding,
                borderRadius: parseFloat(style.borderRadius || '0'),
                outlineColor: parseCssColorToHex(style.outlineColor),
                outlineWidth: parseFloat(style.outlineWidth || "0"),
                borderTopWidth: parseFloat(style.borderTopWidth || "0"),
                borderBottomWidth: parseFloat(style.borderBottomWidth || "0"),
                borderRightWidth: parseFloat(style.borderRightWidth || "0"),
                borderLeftWidth: parseFloat(style.borderLeftWidth || "0"),
                borderTopColor: parseCssColorToHex(style.borderTopColor),
                borderBottomColor: parseCssColorToHex(style.borderBottomColor),
                borderRightColor: parseCssColorToHex(style.borderRightColor),
                borderLeftColor: parseCssColorToHex(style.borderLeftColor),
            },
        }
    }

    const getLowestUniqueElement = (root: HTMLElement, text: string, uid: string): HTMLElement | null => {
        const candidates = Array.from(root.querySelectorAll("*")).filter(
            el => el instanceof HTMLElement && el.textContent?.includes(text)
        ) as HTMLElement[]

        const uidNum = uid.split('-')[1];
        // candidates.sort((a, b) => b.querySelectorAll("*").length - a.querySelectorAll("*").length)

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

    const assignElementUIDs = (allNodes: Element[]) => {
        let idx = 0;
        for (const el of allNodes) {
            if (el instanceof HTMLElement) {
                el.setAttribute("data-uid", `el-${idx}`)
                idx++;
            }
        }
    }

    const hasVisualStyle = (style: CSSStyleDeclaration) => {
        const hasBg = style.backgroundColor &&
            style.backgroundColor !== "transparent" &&
            style.backgroundColor !== "rgba(0, 0, 0, 0)";

        const hasBorder = parseFloat(style.borderWidth || "0") > 0 &&
            style.borderColor &&
            style.borderColor !== "transparent" &&
            style.borderColor !== "rgba(0, 0, 0, 0)";

        const hasShadow = !!style.boxShadow && style.boxShadow !== "none";

        return hasBg || hasBorder || hasShadow;
    };


    const setupPresentation = (root: HTMLElement) => {
        const rootRect = root.getBoundingClientRect();
        const sizeX = 14.4;
        const sizeY = 14.58;
        const rootWidth = rootRect.width;
        const rootHeight = rootRect.height;

        const scaleX = sizeX / rootWidth;
        const scaleY = sizeY / rootHeight;

        const pxToInX = (px: number) => px * scaleX;
        const pxToInY = (px: number) => px * scaleY;

        const ppt = new PptxGenJS();
        ppt.defineLayout({ name: "Custom", width: sizeX, height: sizeY });
        ppt.layout = "Custom";

        const slide = ppt.addSlide();
        slide.background = { fill: "#F5F5F5" };

        return { ppt, slide, pxToInX, pxToInY, rootRect, sizeX, sizeY };
    };

    const addTitle = (slide: PptxGenJS.Slide, title: string, sizeX: number) => {
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
    };

    const getRenderableTextNodes = (root: HTMLElement, allNodes: Element[]): HTMLElement[] => {
        const textNodes: HTMLElement[] = [];
        const renderedUIDs = new Set<string>();

        for (const el of allNodes) {
            console.log('----------------------------');
            console.log(el);
            if (!(el instanceof HTMLElement)) continue;
            if (el.closest(".no-print")) continue;

            const text = el.innerText.trim();
            const uid = el.getAttribute("data-uid");
            if (!text || !uid || renderedUIDs.has(uid)) continue;

            const target = getLowestUniqueElement(root, text, uid);
            const targetUID = target?.getAttribute("data-uid");
            if (target && targetUID && !renderedUIDs.has(targetUID)) {
                textNodes.push(target);
                console.log('Select: ', text);
                renderedUIDs.add(targetUID);
            }
        }

        return textNodes;
    };

    const getCommonAncestor = (nodes: HTMLElement[]) => {
        if (nodes.length === 0) return null;
        let current = nodes[0].parentElement;
        while (current) {
            if (nodes.every(n => current?.contains(n))) return current;
            current = current.parentElement;
        }
        return null;
    };

    const renderShapes = (
        slide: PptxGenJS.Slide,
        allNodes: Element[],
        textNodes: HTMLElement[],
        outermostWrapper: HTMLElement | null,
        rootRect: DOMRect,
        pxToInX: (px: number) => number,
        pxToInY: (px: number) => number,
        ppt: PptxGenJS
    ) => {
        const shapeUIDs = new Set<string>();

        for (const el of allNodes.reverse()) {
            if (!(el instanceof HTMLElement)) continue;
            const uid = el.getAttribute("data-uid");
            if (!uid || shapeUIDs.has(uid)) continue;
            if (el.closest(".no-print") || el === outermostWrapper) continue;

            const style = getComputedStyle(el);

            if (!hasVisualStyle(style)) continue;

            const containsTextChild = textNodes.some(textEl => el.contains(textEl));
            if (!containsTextChild) continue;

            const info = getElementInfo(el, rootRect, pxToInX, pxToInY);
            const isRounded = info.styles.borderRadius > 0;
            const lineWidth = Math.max(info.styles.borderWidth, info.styles.outlineWidth || 0);
            const showLine = lineWidth > 0;

            slide.addShape(isRounded ? ppt.ShapeType.roundRect : ppt.ShapeType.roundRect, {
                x: info.x,
                y: info.y,
                w: info.w,
                h: info.h,
                fill: info.styles.backgroundColor !== "transparent" ? { color: info.styles.backgroundColor } : undefined,
                ...(showLine
                    ? {
                        line: {
                            color: info.styles.borderColor || info.styles.outlineColor || "transparent",
                            width: lineWidth,
                        },
                    }
                    : {}),
            });

            shapeUIDs.add(uid);
        }
    };

    const renderTextElements = (
        slide: PptxGenJS.Slide,
        textNodes: HTMLElement[],
        rootRect: DOMRect,
        pxToInX: (px: number) => number,
        pxToInY: (px: number) => number,
        ppt: PptxGenJS
    ) => {
        const barLengthShrink = 0.02;

        for (const el of textNodes) {
            const info = getElementInfo(el, rootRect, pxToInX, pxToInY);
            if (!info.text.trim()) continue;

            const fillColor = info.styles.backgroundColor;
            const shouldApplyFill = fillColor && fillColor !== "transparent";
            const lineWidth = Math.max(info.styles.borderWidth, info.styles.outlineWidth || 0);
            const showLine = lineWidth > 0;

            const borderSides = {
                top: info.styles.borderTopWidth > 0,
                right: info.styles.borderRightWidth > 0,
                bottom: info.styles.borderBottomWidth > 0,
                left: info.styles.borderLeftWidth > 0,
            };

            const sideColors = {
                top: parseCssColorToHex(info.styles.borderTopColor),
                right: parseCssColorToHex(info.styles.borderRightColor),
                bottom: parseCssColorToHex(info.styles.borderBottomColor),
                left: parseCssColorToHex(info.styles.borderLeftColor),
            };

            slide.addText(info.text, {
                x: info.x,
                y: info.y,
                w: info.w,
                h: info.h,
                fontSize: info.styles.fontSize || 12,
                color: info.styles.color || "#000000",
                ...(shouldApplyFill ? { fill: { color: fillColor } } : {}),
                bold: info.styles.fontWeight === "bold" || parseInt(info.styles.fontWeight) >= 600,
                align: info.styles.textAlign as any,
                ...(showLine
                    ? {
                        line: {
                            color: info.styles.borderColor || info.styles.outlineColor || "transparent",
                            width: lineWidth,
                        },
                    }
                    : {}),
                margin: parseInt(info.styles.padding) || 0,
            });

            if (borderSides.left) {
                slide.addShape(ppt.ShapeType.roundRect, {
                    x: info.x + barLengthShrink / 5,
                    y: info.y + barLengthShrink / 2,
                    w: pxToInX(info.styles.borderLeftWidth),
                    h: info.h - barLengthShrink,
                    fill: { color: sideColors.left },
                    line: { color: sideColors.left, width: 0 },
                });
            }
            if (borderSides.right) {
                slide.addShape(ppt.ShapeType.roundRect, {
                    x: info.x + info.w - info.styles.borderRightWidth,
                    y: info.y,
                    w: info.styles.borderRightWidth,
                    h: info.h - barLengthShrink,
                    fill: { color: sideColors.right },
                    line: { color: sideColors.right, width: 0 },
                });
            }
            if (borderSides.top) {
                slide.addShape(ppt.ShapeType.roundRect, {
                    x: info.x,
                    y: info.y,
                    w: info.w - barLengthShrink,
                    h: info.styles.borderTopWidth,
                    fill: { color: sideColors.top },
                    line: { color: sideColors.top, width: 0 },
                });
            }
            if (borderSides.bottom) {
                slide.addShape(ppt.ShapeType.roundRect, {
                    x: info.x,
                    y: info.y + info.h - info.styles.borderBottomWidth,
                    w: info.w - barLengthShrink,
                    h: info.styles.borderBottomWidth,
                    fill: { color: sideColors.bottom },
                    line: { color: sideColors.bottom, width: 0 },
                });
            }
        }
    };

    const renderCharts = (slide: PptxGenJS.Slide,
        allNodes: Element[],
        rootRect: DOMRect,
        pxToInX: (px: number) => number,
        pxToInY: (px: number) => number) => {

        for (const el of allNodes) {
            if (el.closest(".no-print")) continue;

            const chartMetaRaw = el.getAttribute("data-chart");
            if (!chartMetaRaw) continue;
            if (!chartMetaRaw.trim().startsWith("{") || !chartMetaRaw.trim().endsWith("}")) continue;

            try {
                const chartMeta = JSON.parse(chartMetaRaw);
                if (!chartMeta) continue;

                const info = getElementInfo(el as HTMLElement, rootRect, pxToInX, pxToInY);
                let pptChartData: any[] = [];

                if (chartMeta.chartType === "bar" && chartMeta.colors?.length > 0) {
                    pptChartData = chartMeta.labels.map((label: string, i: number) => ({
                        name: label,
                        labels: [""],
                        values: [chartMeta.values[i]],
                    }));
                }
                else {
                    pptChartData = [
                        {
                            name: "Chart",
                            labels: chartMeta.labels,
                            values: chartMeta.values,
                        },
                    ];
                }

                const chartOptions: PptxGenJS.IChartOpts = {
                    x: info.x,
                    y: info.y,
                    w: info.w,
                    h: info.h,
                    chartColors: chartMeta.colors,
                    showLegend: true,
                    legendPos: "b",
                    showValue: true,
                    dataLabelFontSize: 8,
                    legendFontSize: 15,
                    legendColor: chartMeta.legendColor || "#000000",
                    dataLabelColor: chartMeta.lableColor || "#000000",
                    dataLabelPosition:
                        chartMeta.chartType === "pie" || chartMeta.chartType === "doughnut"
                            ? "outEnd"
                            : "t",
                    // showDataTable: true,
                    // showLabel:true,
                    // showPercent:true
                    // showDataTableOutline: true,
                    // showDataTableVertBorder: true,
                    // showDataTableHorzBorder: true,
                    // showDataTableKeys: true,
                };

                slide.addChart(
                    chartMeta.chartType as PptxGenJS.CHART_NAME,
                    pptChartData,
                    chartOptions,
                );

            } catch (e) {
                console.log("Invalid chart metadata", e);
            }
        }
    }



























    const collectBackgrounds = (
        allNodes: Element[],
        outermostWrapper: HTMLElement | null,
        rootRect: DOMRect,
        pxToInX: (px: number) => number,
        pxToInY: (px: number) => number
    ): ComponentGroup[] => {
        const groups: ComponentGroup[] = [];
        const shapeUIDs = new Set<string>();

        const isOverlapping = (a: any, b: any) => {
            const aLeft = a.x;
            const aRight = a.x + a.w;
            const aTop = a.y;
            const aBottom = a.y + a.h;

            const bLeft = b.x;
            const bRight = b.x + b.w;
            const bTop = b.y;
            const bBottom = b.y + b.h;

            return !(
                aRight < bLeft ||
                aLeft > bRight ||
                aBottom < bTop ||
                aTop > bBottom
            );
        };

        for (const el of allNodes) {
            if (!(el instanceof HTMLElement)) continue;
            const uid = el.getAttribute("data-uid");

            if (!uid || shapeUIDs.has(uid)) continue;
            if (el.closest(".no-print") || el === outermostWrapper) continue;

            const style = getComputedStyle(el);
            if (!hasVisualStyle(style)) continue;

            const info = getElementInfo(el, rootRect, pxToInX, pxToInY);

            const overlapsExisting = groups.some(group =>
                group.background && isOverlapping(info, group.background)
            );

            if (overlapsExisting) continue;

            groups.push({
                background: info,
                texts: [],
                charts: [],
            });

            shapeUIDs.add(uid);
        }

        return groups;
    };


    const assignTextsToGroups = (
        textNodes: Element[],
        groups: ComponentGroup[],
        rootRect: DOMRect,
        pxToInX: (px: number) => number,
        pxToInY: (px: number) => number
    ) => {
        const isInside = (element: any, bg: any) => {
            const elLeft = element.x;
            const elRight = element.x + element.w;
            const elTop = element.y;
            const elBottom = element.y + element.h;

            const bgLeft = bg.x;
            const bgRight = bg.x + bg.w;
            const bgTop = bg.y;
            const bgBottom = bg.y + bg.h;

            // Must be completely inside background
            return (
                elLeft >= bgLeft &&
                elRight <= bgRight &&
                elTop >= bgTop &&
                elBottom <= bgBottom
            );
        };

        for (const el of textNodes) {
            if (!(el instanceof HTMLElement)) continue;

            const style = getComputedStyle(el);
            if (!hasVisualStyle(style)) continue;

            const info = getElementInfo(el, rootRect, pxToInX, pxToInY);
            if (!info.text.trim()) continue;

            const targetGroup = groups.find(group =>
                group.background && isInside(info, group.background)
            );

            if (targetGroup) {
                targetGroup.texts.push(info);
            }
        }
    };


    const assignChartsToGroups = (
        groups: ComponentGroup[],
        allNodes: Element[],
        rootRect: DOMRect,
        pxToInX: (px: number) => number,
        pxToInY: (px: number) => number
    ) => {
        for (const el of allNodes) {
            if (!(el instanceof HTMLElement)) continue;
            if (el.closest(".no-print")) continue;

            const chartMetaRaw = el.getAttribute("data-chart");
            if (!chartMetaRaw) continue;

            const info = getElementInfo(el, rootRect, pxToInX, pxToInY);

            const targetGroup = groups.find(group => {
                if (!group.background) return false;
                const bg = group.background;

                const bgLeft = bg.x;
                const bgRight = bg.x + bg.w;
                const bgTop = bg.y;
                const bgBottom = bg.y + bg.h;

                const elLeft = info.x;
                const elRight = info.x + info.w;
                const elTop = info.y;
                const elBottom = info.y + info.h;

                return (
                    elLeft >= bgLeft &&
                    elRight <= bgRight &&
                    elTop >= bgTop &&
                    elBottom <= bgBottom
                );
            });

            if (targetGroup) {
                targetGroup.charts.push(info);
            }
        }
    };




    const handleDownload = async () => {
        if (!contentRef.current) return;

        const root = contentRef.current;
        const { ppt, slide, pxToInX, pxToInY, rootRect, sizeX } = setupPresentation(root);
        const allNodes = Array.from(root.querySelectorAll("*"));

        addTitle(slide, title, sizeX);
        assignElementUIDs(allNodes);

        const textNodes = getRenderableTextNodes(root, allNodes);
        const outermostWrapper = getCommonAncestor(textNodes);

        const groups = collectBackgrounds(allNodes, outermostWrapper, rootRect, pxToInX, pxToInY);
        assignTextsToGroups(textNodes, groups, rootRect, pxToInX, pxToInY);
        assignChartsToGroups(groups, allNodes, rootRect, pxToInX, pxToInY);
        console.log("Grouped Components:", groups);

        // renderShapes(slide, allNodes, textNodes, outermostWrapper, rootRect, pxToInX, pxToInY, ppt);
        // renderTextElements(slide, textNodes, rootRect, pxToInX, pxToInY, ppt);
        // renderCharts(slide, allNodes, rootRect, pxToInX, pxToInY);

        // ppt.writeFile({ fileName: `${title}.pptx` });
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
            <DialogContent className="!w-[1000px] !max-w-[95vw] h-[90vh] max-h-[95vh] overflow-hidden">
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