import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "../components/ui/Card";
import { motion } from "framer-motion";
import { Button } from "../components/ui/Button";

export default function HomePage() {
  return (
    <motion.div
      className="max-w-3xl mx-auto mt-20"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="p-8 text-center">
        <CardContent>
          <h1 className="text-3xl font-bold mb-6">FIAP STRIDE Threat Modeler</h1>
          <p className="mb-6 text-gray-700">
            Bem-vindo à plataforma de análise de vulnerabilidades baseada em STRIDE.
            Escolha uma opção abaixo para começar:
          </p>
          <div className="flex flex-col md:flex-row justify-center gap-4">
            <Link to="/upload"><Button>Upload do Diagrama</Button></Link>
            <Link to="/analysis"><Button>Ver Análise</Button></Link>
            <Link to="/stride"><Button>Ver STRIDE</Button></Link>
            <Link to="/report"><Button>Relatório Final</Button></Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
