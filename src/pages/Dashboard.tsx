import { useState, useRef } from "react";
import Chart from "../components/Chart";
import InfoBox from "../components/InfoBox";
import PdfDownloadModal from "./PdfDownloader";

function Dashboard() {
      const printRef = useRef<HTMLDivElement>(null);
      const [showModal, setShowModal] = useState(false);

      async function Download() {
            if (!printRef.current) return;
            setShowModal(true);
      }

      return (
            <>
                  <div
                        className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8"
                        ref={printRef}
                  >
                        <div className="max-w-6xl mx-auto flex flex-col gap-6">

                              <div className="flex flex-col sm:flex-row items-center justify-between bg-white p-4 rounded-lg shadow no-print">
                                    <h1 className="text-xl font-bold text-gray-800 mb-3 sm:mb-0">
                                          Dashboard
                                    </h1>
                                    <button
                                          type="button"
                                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm sm:text-base"
                                          onClick={Download}
                                    >
                                          Download
                                    </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white p-6 rounded-lg shadow">
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

                  <PdfDownloadModal
                        isOpen={showModal}
                        onClose={() => setShowModal(false)}
                        contentRef={printRef}
                  />
            </>
      );
}

export default Dashboard;
