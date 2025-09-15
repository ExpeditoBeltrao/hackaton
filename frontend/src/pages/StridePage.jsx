import React, { useState } from "react";
import axios from "axios";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { motion } from "framer-motion";

export default function StridePage() {
  const [analysisId, setAnalysisId] = useState("");
  const [threats, setThreats] = useState(null);

  const fetchStride = async () => {
    try {
      const res = await axios.get(`http://localhost:8000/api/stride/${analysisId}`);
      setThreats(res.data.threats);
    } catch (e) {
      alert("Erro ao buscar STRIDE");
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card className="p-6">
        <h1 className="text-2xl font-bold mb-4">Análise STRIDE</h1>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={analysisId}
              onChange={(e) => setAnalysisId(e.target.value)}
              placeholder="Digite o ID da análise"
              className="border p-2 flex-1"
            />
            <Button onClick={fetchStride}>Buscar</Button>
          </div>

          {threats && (
            <div className="grid md:grid-cols-2 gap-4">
              {threats.map((t, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="p-4">
                    <h2 className="font-semibold">{t.title}</h2>
                    <p><strong>Componente:</strong> {t.component}</p>
                    <p><strong>Tipo:</strong> {t.threat_type}</p>
                    <p><strong>Severidade:</strong> {t.severity}</p>
                    <p><strong>Descrição:</strong> {t.description}</p>
                    <p><strong>Mitigação:</strong> {t.mitigation}</p>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
