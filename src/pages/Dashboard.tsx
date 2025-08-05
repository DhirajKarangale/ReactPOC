"use client"

import { useState, useRef } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"

import Chart from "../components/Chart"
import InfoBox from "../components/InfoBox"
import PdfDownloader from "./PdfDownloader"
import PptDownloadModal from "./PptDownloader"

function Dashboard() {
      const printRef = useRef<HTMLDivElement>(null)
      const [showPdfModal, setShowPdfModal] = useState(false)
      const [showPptModal, setShowPptModal] = useState(false)

      return (
            <>
                  <div className="min-h-screen bg-muted p-4 sm:p-6 md:p-8" ref={printRef}>
                        <div className="max-w-6xl mx-auto flex flex-col gap-6">

                              <Card className="no-print">
                                    <CardHeader className="flex flex-col sm:flex-row items-center justify-between">
                                          <CardTitle className="text-xl">Dashboard</CardTitle>
                                          <div className="flex flex-wrap gap-2">
                                                <Button onClick={() => setShowPdfModal(true)}>Download PDF</Button>
                                                <Button onClick={() => setShowPptModal(true)} variant="outline">Download PPT</Button>
                                          </div>
                                    </CardHeader>
                              </Card>

                              <div className="bg-transparent grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6">
                                    <div className="chart-snapshot" data-id="chart-1">
                                          <Chart title="Chart 1" />
                                    </div>

                                    <InfoBox title="Information 1" />
                                    <InfoBox title="Information 2" />
                                    <InfoBox title="Information 3" />
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 no-print">
                                    <Chart title="Chart 2" />
                                    <InfoBox title="Information 4" />
                              </div>
                        </div>
                  </div>

                  <PdfDownloader
                        isOpen={showPdfModal}
                        onClose={() => setShowPdfModal(false)}
                        contentRef={printRef}
                  />

                  <PptDownloadModal
                        isOpen={showPptModal}
                        onClose={() => setShowPptModal(false)}
                        contentRef={printRef}
                  />
            </>
      )
}

export default Dashboard