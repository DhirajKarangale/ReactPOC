"use client"

import React, { useEffect, useRef, useState, type MutableRefObject } from "react"
import { toPng } from "html-to-image"
import PptxGenJS from "pptxgenjs"
import { formatHex, parse, converter } from "culori"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"

interface PptDownloaderProps {
    isOpen: boolean
    onClose: () => void
    contentRef: MutableRefObject<HTMLDivElement | null>
}

function PptDownloader({ isOpen, onClose, contentRef }: PptDownloaderProps) {
    const [title, setTitle] = useState("PPT Title");
    const [previewImage, setPreviewImage] = useState<any>(null);
    const previewRef = useRef(null);
    const toRgb = converter('rgb');

    const parseColorToHex = (color: string) => {
        if (!color) return "transparent";

        const isTransparent =
            color === "transparent" ||
            color === "rgba(0, 0, 0, 0)" ||
            color === "rgba(255, 255, 255, 0)";

        if (isTransparent) return "transparent";

        try {
            const parsed = parse(color);
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
            element: el,
            text: el.innerText || "",
            x: pxToInX(rect.left - rootRect.left),
            y: pxToInY(rect.top - rootRect.top),
            w: pxToInX(rect.width),
            h: pxToInY(rect.height),
            styles: {
                backgroundColor: parseColorToHex(style.backgroundColor),
                color: parseColorToHex(style.color),
                fontSize: parseInt(style.fontSize),
                fontWeight: style.fontWeight,
                textAlign: style.textAlign,
                borderColor: parseColorToHex(style.borderColor),
                borderWidth: parseFloat(style.borderWidth || '0'),
                margin: style.margin,
                padding: style.padding,
                borderRadius: parseFloat(style.borderRadius || '0'),
                outlineColor: parseColorToHex(style.outlineColor),
                outlineWidth: parseFloat(style.outlineWidth || "0"),
                borderTopWidth: pxToInY(parseFloat(style.borderTopWidth || "0")),
                borderBottomWidth: pxToInY(parseFloat(style.borderBottomWidth || "0")),
                borderRightWidth: pxToInX(parseFloat(style.borderRightWidth || "0")),
                borderLeftWidth: pxToInX(parseFloat(style.borderLeftWidth || "0")),
                borderTopColor: parseColorToHex(style.borderTopColor),
                borderBottomColor: parseColorToHex(style.borderBottomColor),
                borderRightColor: parseColorToHex(style.borderRightColor),
                borderLeftColor: parseColorToHex(style.borderLeftColor),
            },
        }
    }

    const getLowestUniqueElement = (root: HTMLElement, text: string, uid: string): HTMLElement | null => {
        const candidates = Array.from(root.querySelectorAll<HTMLElement>("*")).filter(
            (el): el is HTMLElement => el.textContent?.includes(text) ?? false
        );

        const uidNum = uid.split('-')[1];

        for (const el of candidates) {
            const elUid = el.getAttribute("data-uid")?.split('-')[1];
            if (!elUid || elUid < uidNum) continue;

            const children = Array.from(el.querySelectorAll<HTMLElement>("*"));
            const hasChildWithSameText = children.some(child => child.textContent?.trim() === text.trim());

            if (!hasChildWithSameText) {
                return el;
            }
        }

        return null;
    }

    const assignElementUIDs = (allNodes: any) => {
        let idx = 0;
        for (const el of allNodes) {
            if (el instanceof HTMLElement) {
                el.setAttribute("data-uid", `el-${idx}`)
                idx++;
            }
        }
    }

    const hasVisualStyle = (style: any) => {
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

    const setupPresentation = (root: any) => {
        const rootRect = root.getBoundingClientRect();
        const sizeX = 14.4;
        const sizeY = 14.58;
        const rootWidth = rootRect.width;
        // const rootHeight = rootRect.height;
        const rootHeight = 1862.3333740234375;

        const scaleX = sizeX / rootWidth;
        const scaleY = sizeY / rootHeight;

        const pxToInX = (px: number) => px * scaleX;
        const pxToInY = (px: number) => px * scaleY;

        const ppt = new PptxGenJS();
        ppt.defineLayout({ name: "Custom", width: sizeX, height: sizeY });
        ppt.layout = "Custom";

        return { ppt, pxToInX, pxToInY, rootRect, sizeX, sizeY };
    };

    const addTitle = (slide: any, title: any, sizeX: any) => {
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

    const getRenderableTextNodes = (root: any, allNodes: any) => {
        const textNodes = [];
        const renderedUIDs = new Set();

        for (const el of allNodes) {
            if (!(el instanceof HTMLElement)) continue;
            if (el.closest(".no-print")) continue;

            const text = el.innerText.trim();
            const uid = el.getAttribute("data-uid");
            if (!text || !uid || renderedUIDs.has(uid)) continue;

            const target = getLowestUniqueElement(root, text, uid) as HTMLElement;
            const targetUID = target?.getAttribute("data-uid");
            if (target && targetUID && !renderedUIDs.has(targetUID)) {
                textNodes.push(target);
                renderedUIDs.add(targetUID);
            }
        }

        return textNodes;
    };

    const getCommonAncestor = (nodes: any) => {
        if (nodes.length === 0) return null;
        let current = nodes[0].parentElement;
        while (current) {
            if (nodes.every((n: any) => current?.contains(n))) return current;
            current = current.parentElement;
        }
        return null;
    };

    const collectBackgrounds = (
        allNodes: any,
        outermostWrapper: any,
        rootRect: any,
        pxToInX: any,
        pxToInY: any
    ) => {
        const groups: any = [];
        const shapeUIDs = new Set();

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

            const overlapsExisting = groups.some((group: any) =>
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
        textNodes: any,
        groups: any,
        rootRect: any,
        pxToInX: any,
        pxToInY: any
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

            return (
                elLeft >= bgLeft &&
                elRight <= bgRight &&
                elTop >= bgTop &&
                elBottom <= bgBottom
            );
        };

        for (const el of textNodes) {
            if (!(el instanceof HTMLElement)) continue;

            const info = getElementInfo(el, rootRect, pxToInX, pxToInY);
            if (!info.text.trim()) continue;

            const targetGroup = groups.find((group: any) =>
                group.background && isInside(info, group.background)
            );

            if (targetGroup) {
                targetGroup.texts.push(info);
            }
        }
    };

    const assignChartsToGroups = (
        allNodes: any,
        groups: any,
        rootRect: any,
        pxToInX: any,
        pxToInY: any
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

            return (
                elLeft >= bgLeft &&
                elRight <= bgRight &&
                elTop >= bgTop &&
                elBottom <= bgBottom
            );
        };

        for (const el of allNodes) {
            if (el.closest(".no-print")) continue;

            const chartMetaRaw = el.getAttribute("data-chart");
            if (!chartMetaRaw) continue;
            if (!chartMetaRaw.trim().startsWith("{") || !chartMetaRaw.trim().endsWith("}")) continue;

            const info = getElementInfo(el, rootRect, pxToInX, pxToInY);
            const targetGroup = groups.find((group: any) =>
                group.background && isInside(info, group.background)
            );

            if (targetGroup) {
                targetGroup.charts.push(info);
            }
        }
    };

    const assignPosition = (groups: any, slideHeight: any) => {
        let slide = 1;
        let offsetY = 0;

        for (const group of groups) {
            const groupHeight = group.background.h + group.background.y;
            if (groupHeight > slideHeight * slide) {
                slide++;

                const newPos1 = slideHeight * (slide - 1);
                const newGPos = group.background.y - newPos1;
                offsetY = 0.1 - newGPos;
            }

            group.slide = slide;

            if (slide > 1) {
                const newPos = (slideHeight * (slide - 1)) - offsetY;
                group.background.y -= newPos;

                for (const text of group.texts) {
                    text.y -= newPos;
                }

                for (const chart of group.charts) {
                    chart.y = newPos;
                }
            }
        }
    }

    const assignPosition2 = (groups: any, slideHeight: any, slideWidth: any) => {
        const scaleFactor = 1.5;

        let slide = 1;
        let positionInSlide = 0;

        for (const group of groups) {
            const oldX = group.background.x;
            const oldY = group.background.y;

            const centerOldX = oldX + group.background.w / 2;
            const centerOldY = oldY + group.background.h / 2;
            group.background.w *= scaleFactor;
            group.background.h *= scaleFactor;
            group.background.x = centerOldX - group.background.w / 2;
            group.background.y = centerOldY - group.background.h / 2;

            for (const text of group.texts) {
                const centerX = oldX + group.background.w / (2 * scaleFactor);
                const centerY = oldY + group.background.h / (2 * scaleFactor);
                text.w *= scaleFactor;
                text.h *= scaleFactor;
                text.x = centerX + (text.x - oldX - group.background.w / (2 * scaleFactor)) * scaleFactor;
                text.y = centerY + (text.y - oldY - group.background.h / (2 * scaleFactor)) * scaleFactor;
                text.styles.fontSize *= scaleFactor;
            }

            for (const chart of group.charts) {
                const centerX = oldX + group.background.w / (2 * scaleFactor);
                const centerY = oldY + group.background.h / (2 * scaleFactor);
                chart.w *= scaleFactor;
                chart.h *= scaleFactor;
                chart.x = centerX + (chart.x - oldX - group.background.w / (2 * scaleFactor)) * scaleFactor;
                chart.y = centerY + (chart.y - oldY - group.background.h / (2 * scaleFactor)) * scaleFactor;
            }

            group.slide = slide;
            const centerXPos = (slideWidth - group.background.w) / 2;
            let newY;
            const margin = 0.5;
            if (positionInSlide === 0) {
                newY = margin;
                if (slide == 1) newY = 1.5;
            } else {
                newY = slideHeight - group.background.h - margin;
            }

            const dx = centerXPos - group.background.x;
            const dy = newY - group.background.y;

            group.background.x += dx;
            group.background.y += dy;

            for (const text of group.texts) {
                text.x += dx;
                text.y += dy;
            }
            for (const chart of group.charts) {
                chart.x += dx;
                chart.y += dy;
            }

            positionInSlide++;
            if (positionInSlide > 1) {
                slide++;
                positionInSlide = 0;
            }
        }
    };

    const createSlides = (ppt: any, groups: any) => {
        const mxSlides = Math.max(...groups.map((g: any) => g.slide));
        const slides = [];

        for (let i = 1; i <= mxSlides; i++) {
            const slide = ppt.addSlide();
            slide.background = { fill: "#F5F5F5" };
            slides.push(slide);
        }

        return slides;
    }

    const addBackgrounds = (groups: any, slides: any, ppt: any) => {
        for (const group of groups) {
            const background = group.background;
            const isRounded = background.styles.borderRadius > 0;
            const lineWidth = Math.max(background.styles.borderWidth, background.styles.outlineWidth || 0);
            const showLine = lineWidth > 0;

            slides[group.slide - 1].addShape(isRounded ? ppt.ShapeType.roundRect : ppt.ShapeType.roundRect, {
                x: background.x,
                y: background.y,
                w: background.w,
                h: background.h,
                fill: background.styles.backgroundColor !== "transparent" ? { color: background.styles.backgroundColor } : undefined,
                ...(showLine
                    ? {
                        line: {
                            color: background.styles.borderColor || background.styles.outlineColor || "transparent",
                            width: lineWidth,
                        },
                    }
                    : {}),
            });
        }
    }

    const addTexts = (groups: any, slides: any, ppt: any) => {
        const barLengthShrink = 0.03;

        for (const group of groups) {
            for (const info of group.texts) {
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
                    top: parseColorToHex(info.styles.borderTopColor),
                    right: parseColorToHex(info.styles.borderRightColor),
                    bottom: parseColorToHex(info.styles.borderBottomColor),
                    left: parseColorToHex(info.styles.borderLeftColor),
                };

                slides[group.slide - 1].addText(info.text, {
                    x: info.x,
                    y: info.y,
                    w: info.w,
                    h: info.h,
                    fontSize: info.styles.fontSize || 12,
                    color: info.styles.color || "#000000",
                    ...(shouldApplyFill ? { fill: { color: fillColor } } : {}),
                    bold: info.styles.fontWeight === "bold" || parseInt(info.styles.fontWeight) >= 600,
                    align: info.styles.textAlign,
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
                    slides[group.slide - 1].addShape(ppt.ShapeType.roundRect, {
                        x: info.x + barLengthShrink / 5,
                        y: info.y + barLengthShrink / 2,
                        w: info.styles.borderLeftWidth,
                        h: info.h - barLengthShrink,
                        fill: { color: sideColors.left },
                        line: { color: sideColors.left, width: 0 },
                    });
                }
                if (borderSides.right) {
                    slides[group.slide - 1].addShape(ppt.ShapeType.roundRect, {
                        x: info.x + info.w - info.styles.borderRightWidth,
                        y: info.y,
                        w: info.styles.borderRightWidth,
                        h: info.h - barLengthShrink,
                        fill: { color: sideColors.right },
                        line: { color: sideColors.right, width: 0 },
                    });
                }
                if (borderSides.top) {
                    slides[group.slide - 1].addShape(ppt.ShapeType.roundRect, {
                        x: info.x,
                        y: info.y,
                        w: info.w - barLengthShrink,
                        h: info.styles.borderTopWidth,
                        fill: { color: sideColors.top },
                        line: { color: sideColors.top, width: 0 },
                    });
                }
                if (borderSides.bottom) {
                    slides[group.slide - 1].addShape(ppt.ShapeType.roundRect, {
                        x: info.x,
                        y: info.y + info.h - info.styles.borderBottomWidth,
                        w: info.w - barLengthShrink,
                        h: info.styles.borderBottomWidth,
                        fill: { color: sideColors.bottom },
                        line: { color: sideColors.bottom, width: 0 },
                    });
                }

            }
        }
    }

    const addCharts = (groups: any, slides: any) => {
        for (const group of groups) {
            for (const chart of group.charts) {
                let chartNode = chart.element;

                const chartMetaRaw = chartNode.getAttribute("data-chart");
                if (!chartMetaRaw) continue;
                if (!chartMetaRaw.trim().startsWith("{") || !chartMetaRaw.trim().endsWith("}")) continue;

                try {
                    const chartMeta = JSON.parse(chartMetaRaw);
                    if (!chartMeta) continue;

                    let pptChartData = [];

                    if (chartMeta.chartType === "bar" && chartMeta.colors?.length > 0) {
                        pptChartData = chartMeta.labels.map((label: any, i: any) => ({
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

                    const chartOptions = {
                        x: chart.x,
                        y: chart.y,
                        w: chart.w,
                        h: chart.h,
                        chartColors: chartMeta.colors,
                        showLegend: true,
                        legendPos: "b",
                        showValue: true,
                        dataLabelFontSize: 8,
                        legendFontSize: 15,
                        legendColor: chartMeta.legendColor || "#000000",
                        dataLabelColor: chartMeta.lableColor || "#000000",
                        dataLabelPosition:
                            chartMeta.chartType === "pie" || chartMeta.chartType === "doughnut" ? "outEnd" : "t",
                    };

                    slides[group.slide - 1].addChart(
                        chartMeta.chartType,
                        pptChartData,
                        chartOptions,
                    );

                } catch (e) {
                    console.log("Invalid chart metadata", e);
                }
            }
        }
    }

    const handleDownload = async () => {
        if (!contentRef.current) return;

        const root = contentRef.current;
        const { ppt, pxToInX, pxToInY, rootRect, sizeX, sizeY } = setupPresentation(root);
        const allNodes = Array.from(root.querySelectorAll("*"));

        assignElementUIDs(allNodes);

        const textNodes = getRenderableTextNodes(root, allNodes);
        const outermostWrapper = getCommonAncestor(textNodes);

        const groups = collectBackgrounds(allNodes, outermostWrapper, rootRect, pxToInX, pxToInY);
        assignTextsToGroups(textNodes, groups, rootRect, pxToInX, pxToInY);
        assignChartsToGroups(allNodes, groups, rootRect, pxToInX, pxToInY);
        assignPosition(groups, sizeY);
        // assignPosition2(groups, sizeY, sizeX);

        const slides = createSlides(ppt, groups);
        addTitle(slides[0], title, sizeX);

        addBackgrounds(groups, slides, ppt);
        addTexts(groups, slides, ppt);
        addCharts(groups, slides);

        ppt.writeFile({ fileName: `${title}.pptx` });
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
                const cloneTarget = clonedCharts[i]
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

export default React.memo(PptDownloader);