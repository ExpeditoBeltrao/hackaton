# FIAP STRIDE Threat Modeler

Aplicação web de análise de vulnerabilidades de sistemas baseada na metodologia **STRIDE**, que permite enviar diagramas de arquitetura de software, realizar análise automática com **IA** e gerar relatórios completos.

---

## Tecnologias utilizadas

### Backend

* **Python 3.11+**
* **FastAPI** (API REST)
* **Uvicorn** (servidor ASGI)
* **OpenAI API** (análise de diagramas e geração de STRIDE threats)

### Frontend

* **React 18**
* **React Router DOM** (navegação)
* **Tailwind CSS** (estilização responsiva)
* **Framer Motion** (animações)
* **Axios** (requisições HTTP)

---

## Estrutura do projeto

```
.
├── README.md
├── .vscode/
│   └── settings.json
├── backend/
│   ├── processing.py
│   ├── requirements.txt
│   ├── server.py
│   ├── server_openai.py
│   ├── __pycache__/
│   │   ├── processing.cpython-312.pyc
│   │   ├── server.cpython-312.pyc
│   │   └── server_openai.cpython-312.pyc
│   ├── data/
│   ├── reports/
│   ├── static/
│   └── uploads/
└── frontend/
    ├── index.html
    ├── package.json
    ├── postcss.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx
        ├── index.css
        ├── main.jsx
        ├── assets/
        │   └── logo.png
        ├── components/
        │   └── ui/
        │       ├── Button.jsx
        │       └── Card.jsx
        └── pages/
            ├── HomePage.jsx
            └── UploadPage.jsx
```

---

## Backend - Instalação e execução

1. **Criar ambiente virtual**:

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Linux/Mac
venv\Scripts\activate      # Windows
```

2. **Instalar dependências**:

```bash
pip install -r requirements.txt
```

3. **Configurar chave da OpenAI**:

```bash
export OPENAI_API_KEY="sua_chave_aqui"  # Linux/Mac
set OPENAI_API_KEY="sua_chave_aqui"     # Windows
```

4. **Rodar o servidor**:

```bash
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

O backend estará disponível em `http://localhost:8000`.

---

## Frontend - Instalação e execução

1. **Instalar dependências**:

```bash
cd frontend
npm install
```

2. **Rodar em modo desenvolvimento**:

```bash
npm run dev
```

3. **Abrir navegador**:

```
http://localhost:5173/
```

---

## Rotas principais da aplicação

| Rota Frontend | Página / Funcionalidade             |
| ------------- | ----------------------------------- |
| `/`           | HomePage - Boas-vindas + navegação  |
| `/upload`     | UploadPage - Envio de diagramas     |

---

## Funcionalidades

1. **HomePage**: tela inicial com apresentação e navegação.
2. **UploadPage**: envia diagramas de arquitetura para análise automática usando IA, identifica componentes, executa análise STRIDE e permite download de relatórios.

---

## Integração com OpenAI

* O backend utiliza a API da OpenAI para processar a imagem do diagrama e gerar um **modelo de ameaças STRIDE**.
* Para funcionar, é necessário ter uma chave válida da OpenAI configurada como variável de ambiente (`OPENAI_API_KEY`).
* O fluxo é:

  1. Usuário envia diagrama → `/api/upload`
  2. Backend processa a imagem → chama a OpenAI → retorna análise
  3. Frontend exibe os resultados e STRIDE threats

---

## Observações importantes

* O frontend espera que o backend esteja rodando em `http://localhost:8000`. Ajuste se estiver em outro endereço ou porta.
* A aplicação é responsiva e utiliza componentes estilizados (`Card`, `Button`) com animações suaves (`framer-motion`).
* Relatórios são gerados em JSON e PDF, podendo ser baixados diretamente do frontend.

---

## Execução completa

1. Rodar backend:

```bash
cd backend
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

2. Rodar frontend:

```bash
cd frontend
npm install
npm run dev
```

3. Abrir `http://localhost:5173/` no navegador.

---

## Diagrama de fluxo do projeto

```text
+----------------+       +----------------+       +---------------------+
|                |       |                |       |                     |
|  Frontend      | <-->  |   Backend      | <-->  |   OpenAI API        |
|  (React + UI)  |       | (FastAPI +     |       | (Processamento e    |
|                |       |  processing.py)|       |  geração STRIDE)    |
+----------------+       +----------------+       +---------------------+
       |                         |                         |
       | Upload de Diagrama      |                         |
       |----------------------->|                         |
       |                         |                         |
       |                         | Chamada OpenAI API      |
       |                         |------------------------>|
       |                         |                         |
       |                         | Recebe análise STRIDE   |
       |                         |<------------------------|
       | Recebe resultado        |                         |
       |<-----------------------|                         |
       |                         |                         |
       | Mostra relatório / STRIDE Threats                   |
       |---------------------------------------------------->
       |                         |                         |
```