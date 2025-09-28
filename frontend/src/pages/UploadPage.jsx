import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import { FaArrowLeft, FaUserSecret, FaEdit, FaUndo, FaEye, FaBan, FaKey, FaFilePdf, FaFileCode } from "react-icons/fa";

export default function UploadPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [strideData, setStrideData] = useState({});
  const [expandedComponents, setExpandedComponents] = useState({});
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [loadingComponents, setLoadingComponents] = useState(false);
  const [loadingStride, setLoadingStride] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalComponents, setTotalComponents] = useState(0);
  const [currentComponent, setCurrentComponent] = useState(0);
  const [strideCompleted, setStrideCompleted] = useState(false);

  const steps = [
    { id: 1, label: "Seleção Diagrama" },
    { id: 2, label: "Identificação Componentes" },
    { id: 3, label: "Análise Ameaças - STRIDE" },
  ];

  const strideThreats = [
    { name: "Spoofing", description: "Falsificação de identidade.", icon: <FaUserSecret className="inline mr-2 text-yellow-400" /> },
    { name: "Tampering", description: "Alteração não autorizada de dados.", icon: <FaEdit className="inline mr-2 text-red-400" /> },
    { name: "Repudiation", description: "Negação de ações realizadas.", icon: <FaUndo className="inline mr-2 text-blue-400" /> },
    { name: "Information Disclosure", description: "Vazamento de informações sensíveis.", icon: <FaEye className="inline mr-2 text-purple-400" /> },
    { name: "Denial of Service", description: "Negação de serviço, tornando o sistema indisponível.", icon: <FaBan className="inline mr-2 text-pink-400" /> },
    { name: "Elevation of Privilege", description: "Aumento indevido de privilégios no sistema.", icon: <FaKey className="inline mr-2 text-green-400" /> },
  ];

  const threatIcons = {
    "Spoofing": <FaUserSecret className="inline mr-2 text-yellow-400" />,
    "Tampering": <FaEdit className="inline mr-2 text-red-400" />,
    "Repudiation": <FaUndo className="inline mr-2 text-blue-400" />,
    "Information Disclosure": <FaEye className="inline mr-2 text-purple-400" />,
    "Denial of Service": <FaBan className="inline mr-2 text-pink-400" />,
    "Elevation of Privilege": <FaKey className="inline mr-2 text-green-400" />,
  };

  const threatDescriptions = {
    "Spoofing": "Falsificação de identidade.",
    "Tampering": "Alteração não autorizada de dados.",
    "Repudiation": "Negação de ações realizadas.",
    "Information Disclosure": "Vazamento de informações sensíveis.",
    "Denial of Service": "Negação de serviço, tornando o sistema indisponível.",
    "Elevation of Privilege": "Aumento indevido de privilégios no sistema.",
  };

  const markStepCompleted = (id) => {
    if (!completedSteps.includes(id)) setCompletedSteps(prev => [...prev, id]);
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
  };

  const severityColor = (severity) => {
    switch (severity) {
      case "High": return "text-red-400 font-semibold";
      case "Medium": return "text-yellow-400 font-semibold";
      case "Low": return "text-green-400 font-semibold";
      default: return "text-gray-300";
    }
  };

  const handleToggleComponent = (component) => {
    setExpandedComponents(prev => ({ ...prev, [component]: !prev[component] }));
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith(".png")) {
      alert("Apenas arquivos PNG são permitidos.");
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    if (selectedFile.type !== "image/png") {
      alert("O arquivo selecionado não é um PNG válido.");
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  };

  useEffect(() => {
    if (step === 3 && !strideCompleted && !loadingStride) {
      handleFetchStrideIncremental();
    }
  }, [step]);

  // ----------------------------
  // Step 1: Upload
  // ----------------------------
  const handleUpload = async () => {
    if (!file) return alert("Selecione uma imagem");
    setLoadingUpload(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post("http://localhost:8000/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setAnalysisData(res.data);
      setStrideData({});
      markStepCompleted(1);

      if (res.data.analysis_id) {
        setLoadingComponents(true);
        setStep(2);
        try {
          const compRes = await axios.get(`http://localhost:8000/api/components/${res.data.analysis_id}`);
          setAnalysisData(prev => ({ ...prev, components: compRes.data.components }));
          markStepCompleted(2);
        } catch (err) {
          console.error("Erro ao identificar componentes:", err);
          alert("Falha na identificação de componentes.");
        } finally {
          setLoadingComponents(false);
        }
      }
    } catch (error) {
      console.error(error);
      alert("Falha ao enviar arquivo.");
    } finally {
      setLoadingUpload(false);
    }
  };

  const handleIdentifyComponents = async (analysisIdParam = null) => {
    const analysisId = analysisIdParam || analysisData?.analysis_id;
    if (!analysisId) return;

    setLoadingComponents(true);
    try {
      const res = await axios.get(`http://localhost:8000/api/components/${analysisId}`);
      setAnalysisData(prev => ({ ...prev, components: res.data.components }));
      markStepCompleted(2);
    } catch (error) {
      console.error("Erro ao identificar componentes:", error);
      alert("Falha na identificação de componentes.");
    } finally {
      setLoadingComponents(false);
    }
  };

  const handleFetchStrideIncremental = async () => {
    if (!analysisData?.components) return;
    setLoadingStride(true);
    setStrideCompleted(false);

    const allComponents = Object.entries(analysisData.components).flatMap(([_, comps]) => comps);
    setTotalComponents(allComponents.length);
    let processed = 0;

    for (const comp of allComponents) {
      try {
        const res = await axios.post("http://localhost:8000/api/stride_incremental", {
          analysis_id: analysisData.analysis_id,
          component: comp
        });

        setStrideData(prev => ({
          ...prev,
          [comp.label]: res.data.threats
        }));

        processed++;
        setProgress(processed / allComponents.length);
        setCurrentComponent(processed);
      } catch (err) {
        console.error(`Erro em ${comp.label}:`, err);
        processed++;
        setProgress(processed / allComponents.length);
      }
    }

    setLoadingStride(false);
    setStrideCompleted(true);
    markStepCompleted(3);
  };

  const handleDownloadReport = async (format) => {
    if (!analysisData?.analysis_id) return;

    try {
      const res = await axios.get(
        `http://localhost:8000/api/report/${analysisData.analysis_id}/download?format=${format}`,
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `report_${analysisData.analysis_id}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Erro ao baixar relatório:", err);
      alert("Falha ao baixar relatório");
    }
  };

  // ----------------------------
  // Reset ao voltar para step 1
  // ----------------------------
  const handleStepChange = (newStep) => {
    if (newStep === 1 && step !== 1) {
      const hasProcessedData =
        (analysisData?.components && Object.keys(analysisData.components).length > 0) ||
        (strideCompleted && Object.keys(strideData).length > 0);

      if (hasProcessedData) {
        const confirmReset = window.confirm(
          "Você já processou componentes ou STRIDE. Voltando para o Step 1, todos os dados processados serão limpos. Deseja continuar?"
        );
        if (!confirmReset) return;
      }

      // Limpa os dados processados
      setAnalysisData(null);
      setStrideData({});
      setExpandedComponents({});
      setProgress(0);
      setTotalComponents(0);
      setCurrentComponent(0);
      setStrideCompleted(false);
      setCompletedSteps([]);
      setFile(null);
      setPreviewUrl(null);
    }

    setStep(newStep);
  };

  return (
    <motion.div className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 text-white p-6"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

      {/* Botão Início */}
      <div className="w-full max-w-4xl mb-6 flex justify-start">
        <div
          onClick={() => navigate("/")}
          className="flex items-center gap-2 cursor-pointer hover:text-gray-300 transition-colors"
        >
          <FaArrowLeft size={20} />
          <span className="text-white font-medium">Início</span>
        </div>
      </div>

      {/* Stepper */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-6">
        {steps.map((s, idx) => {
          const isCurrent = s.id === step;
          const isCompleted = completedSteps.includes(s.id);
          const isClickable = isCompleted || isCurrent;
          return (
            <div key={s.id} className="flex-1 flex flex-col items-center cursor-pointer"
              onClick={() => isClickable && handleStepChange(s.id)}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2
                ${isCompleted ? "bg-green-500" : isCurrent ? "bg-blue-500" : "bg-gray-500"}`}>{s.id}</div>
              <span className={`text-sm text-center ${isCompleted || isCurrent ? "text-white" : "text-gray-400"}`}>{s.label}</span>
              {idx < steps.length - 1 && (
                <div className={`flex-1 h-1 ${isCompleted ? "bg-green-500" : "bg-gray-500"}`}></div>
              )}
            </div>
          );
        })}
      </div>

      {/* Step 1 - Upload da Imagem */}
      {step === 1 && (
        <Card className="bg-gray-700/50 p-6 w-full max-w-2xl mb-6">
          <h2 className="text-xl font-semibold mb-4 text-center">1. Selecione o Diagrama para Análise</h2>

          {/* Botão customizado para escolher arquivo + nome do arquivo */}
          <div className="mb-4 flex items-center gap-4">
            <input
              id="fileInput"
              type="file"
              accept=".png"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="fileInput"
              className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-2xl shadow hover:bg-blue-700 transition"
            >
              Selecionar Diagrama
            </label>
            {file && (
              <span className="text-gray-200 font-medium truncate max-w-xs">
                {file.name}
              </span>
            )}
          </div>

          {/* Pré-visualização da imagem */}
          {previewUrl && (
            <div className="mt-4 flex flex-col items-center">
              <img
                src={previewUrl}
                alt="Pré-visualização"
                className="w-48 h-auto rounded-lg border border-gray-600 shadow-md"
              />
              <p className="text-sm text-gray-400 mt-2">
                Pré-visualização da imagem selecionada
              </p>

              {/* Analisar Diagrama */}
              <div className="mt-6 flex justify-center w-full">
                <Button
                  onClick={handleUpload}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Analisar Diagrama
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <motion.div
          className="w-full max-w-4xl mb-6 bg-gray-700/50 backdrop-blur-md p-6 rounded-xl shadow-xl"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <h1 className="text-2xl font-bold mb-4 text-center">2. Identificação de Componentes</h1>

          {loadingComponents ? (
            <div className="text-center text-gray-300 py-6">
              Carregando componentes...
            </div>
          ) : analysisData?.components && Object.keys(analysisData.components).length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                {Object.entries(analysisData.components).map(([type, comps]) => {
                  const isExpanded = expandedComponents[type] ?? true;
                  return (
                    <Card key={type} className="bg-gray-700/50 p-4 rounded-lg shadow-md">
                      <div
                        className="flex justify-between items-center cursor-pointer"
                        onClick={() => handleToggleComponent(type)}
                      >
                        <h2 className="text-lg font-semibold mb-2 capitalize">{type.replace("_", " ")}</h2>
                        <span>{isExpanded ? "-" : "+"}</span>
                      </div>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.ul
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="list-disc list-inside text-gray-200 overflow-hidden mt-2"
                          >
                            {comps.map(c => <li key={c.id}>{c.label}</li>)}
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    </Card>
                  );
                })}
              </div>

              {/* Botão Próximo: Análise STRIDE */}
              <div className="mt-6 flex justify-center">
                <Button
                  onClick={() => setStep(3)}
                  className="w-64 bg-blue-600 hover:bg-blue-700"
                  disabled={loadingStride}
                >
                  Analisar Ameaças - STRIDE
                </Button>
              </div>
            </>
          ) : (
            <p className="text-gray-300 text-center">Nenhum componente identificado.</p>
          )}
        </motion.div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <motion.div
          className="w-full max-w-4xl mb-6"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <h1 className="text-2xl font-bold mb-4 text-center">3. Análise Ameaças - STRIDE</h1>

          {strideCompleted && (
            <div className="flex gap-12 justify-center mt-10">
              <div className="flex flex-col items-center cursor-pointer">
                <FaFilePdf
                  className="text-red-500"
                  size={40}
                  title="Baixar PDF"
                  onClick={() => handleDownloadReport("pdf")}
                />
                <span className="text-sm text-gray-300 mt-2">Relatório PDF</span>
              </div>
              <div className="flex flex-col items-center cursor-pointer">
                <FaFileCode
                  className="text-blue-600"
                  size={40}
                  title="Baixar JSON"
                  onClick={() => handleDownloadReport("json")}
                />
                <span className="text-sm text-gray-300 mt-2">Relatório JSON</span>
              </div>
            </div>
          )}

          <Card className="bg-gray-700/50 p-4 mb-6 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold mb-2">O que é STRIDE?</h2>
            <p className="text-gray-300 text-justify leading-relaxed">
              STRIDE é uma metodologia de análise de ameaças que ajuda a identificar diferentes tipos de riscos em sistemas:
            </p>
            <ul className="list-disc list-inside text-gray-300 mt-2 space-y-1">
              {strideThreats.map(t => (
                <li key={t.name}>
                  {t.icon}
                  <strong>{t.name}:</strong> {t.description}
                </li>
              ))}
            </ul>
          </Card>

          {/* Barra de progresso */}
          {loadingStride && (
            <div className="w-full bg-gray-600 rounded h-8 relative mb-4">
              <div
                className="bg-green-500 h-8 transition-all"
                style={{ width: `${(progress || 0) * 100}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-white font-semibold pointer-events-none">
                Processando componente {currentComponent + 1}/{totalComponents}
              </div>
            </div>
          )}

          {/* Cards de componentes e ameaças */}
          <div className="flex flex-col w-full gap-4">
            {Object.entries(strideData).map(([comp, threats]) => {
              const isExpanded = expandedComponents[comp] ?? true;
              return (
                <Card key={comp} className="bg-gray-700/50 p-4 rounded-lg shadow-md w-full">
                  <div
                    className="flex justify-between items-center cursor-pointer"
                    onClick={() => handleToggleComponent(comp)}
                  >
                    <h2 className="text-lg font-semibold">{comp}</h2>
                    <span>{isExpanded ? "-" : "+"}</span>
                  </div>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-2 overflow-hidden"
                      >
                        {threats.length === 0 ? (
                          <p className="text-gray-300">Nenhuma ameaça identificada.</p>
                        ) : (
                          threats.map((t, idx) => (
                            <Card key={idx} className="bg-gray-700/50 p-3 rounded mb-2 shadow-inner">
                              <p className="leading-relaxed"><strong>Título:</strong> {t.title}</p>
                              <p className="leading-relaxed" title={threatDescriptions[t.threat_type] || ""}>
                                <strong>Tipo:</strong> {threatIcons[t.threat_type]} {t.threat_type}
                              </p>
                              <p className="leading-relaxed"><strong>Severidade:</strong> <span className={severityColor(t.severity)}>{t.severity}</span></p>
                              <p className="text-justify leading-relaxed"><strong>Descrição:</strong> {t.description}</p>
                              <p className="text-justify leading-relaxed"><strong>Mitigação:</strong> {t.mitigation}</p>
                            </Card>
                          ))
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              );
            })}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}