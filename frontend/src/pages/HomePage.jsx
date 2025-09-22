import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "../components/ui/Button";
import logo from "../assets/logo.png"; // caminho da logomarca

export default function HomePage() {
  const navigate = useNavigate();

  const handleStart = () => {
    navigate("/upload"); // redireciona para UploadPage
  };

  return (
    <motion.div
      className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 text-white px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      {/* Card animado com hover */}
      <motion.div
        className="bg-white/20 backdrop-blur-md border-0 shadow-xl shadow-black/30 flex flex-col items-center mb-12 p-8 rounded-xl transition-transform duration-300 hover:scale-105"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <img
          src={logo}
          alt="Logomarca FIAP Software Security"
          className="w-48 sm:w-64 md:w-80 lg:w-96 h-auto mb-6"
        />
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-center drop-shadow-md">
          FIAP STRIDE Threat Modeler
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-gray-100 text-center leading-relaxed drop-shadow-sm">
          <span className="block mb-1">
            Bem-vindo à plataforma de análise de vulnerabilidades baseada em STRIDE.
          </span>
          <span className="block">
            Protegendo sistemas com inovação e inteligência.
          </span>
        </p>
      </motion.div>

      {/* Botão central animado */}
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <Button
          onClick={handleStart}
          aria-label="Iniciar análise de vulnerabilidades"
          className="rounded-full w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 flex items-center justify-center text-xl sm:text-2xl md:text-2xl font-semibold bg-gray-500 hover:bg-gray-600 text-white shadow-lg"
        >
          Iniciar
        </Button>
      </motion.div>
    </motion.div>
  );
}
