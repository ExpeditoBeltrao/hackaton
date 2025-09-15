import React, { useState } from "react";
import axios from "axios";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { motion } from "framer-motion";

export default function ReportPage() {
  const [analysisId, setAnalysisId] = useState("");
  const [report, setReport] = useState(null);

  const fetchReport = async () => {
    try {
      const res = await axios.get(`http://localhost:8000/api/report/${analysisId}`);
      setReport(res.data);
    } catch (e) {
      alert("Erro ao buscar relatório");
    }
  };

  const downloadReport = async () => {
    const url = `http://localhost:8000/api/report/${analysisId}/download`;
    window.open(url, "_blank");
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card className="p-6">
        <h1 className="text-2xl font-bold mb-4">Relatório Final</h1>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={analysisId}
              onChange={(e) => setAnalysisId(e.target.value)}
              placeholder="Digite o ID da análise"
              className="border p-2 flex-1"
            />
            <Button onClick={fetchReport} className="bg-blue-600">Gerar Relatório</Button>
            <Button onClick={downloadReport} className="bg-green-600">Download</Button>
          </div>

          {report && (
            <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
              {JSON.stringify(report, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
