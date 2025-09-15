import React, { useState } from "react";
import axios from "axios";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { motion } from "framer-motion";

export default function AnalysisPage() {
  const [analysisId, setAnalysisId] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchAnalysis = async () => {
    if (!analysisId) return alert("Digite um ID de análise");
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:8000/api/analysis/${analysisId}`);
      setResult(res.data);
    } catch (e) {
      alert("Análise não encontrada");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="min-h-screen flex items-center justify-center bg-gray-100 p-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="w-full max-w-xl p-6">
        <h1 className="text-2xl font-bold mb-4 text-center">Resultado da Análise</h1>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <input
              type="text"
              value={analysisId}
              onChange={(e) => setAnalysisId(e.target.value)}
              placeholder="Digite o ID da análise"
              className="border p-2 flex-1"
            />
            <Button onClick={fetchAnalysis} disabled={loading} className="w-full sm:w-auto">
              {loading ? "Buscando..." : "Buscar"}
            </Button>
          </div>

          {result && (
            <pre className="bg-gray-50 p-4 rounded overflow-x-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
