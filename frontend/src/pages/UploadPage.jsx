import React, { useState } from "react"; // ⚠️ Import React necessário
import axios from "axios";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { motion } from "framer-motion";

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [analysisId, setAnalysisId] = useState(null);
  const [loading, setLoading] = useState(false); // Para feedback de envio

  const handleUpload = async () => {
    if (!file) return alert("Selecione uma imagem");
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post("http://localhost:8000/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setAnalysisId(res.data.analysis_id);
    } catch (error) {
      console.error("Erro ao enviar arquivo:", error);
      alert("Falha ao enviar o arquivo. Tente novamente.");
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
        <h1 className="text-2xl font-bold mb-4 text-center">Upload do Diagrama</h1>
        <CardContent>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files[0])}
            className="mb-4 w-full"
          />
          <Button onClick={handleUpload} className="w-full" disabled={loading}>
            {loading ? "Enviando..." : "Enviar"}
          </Button>

          {analysisId && (
            <p className="mt-4 text-green-600 text-center">
              Análise iniciada: {analysisId}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
