# 🌍 Waylog — Rede Social & Diário de Viagens Autônomo

Alinhado ao Plano de Curso — Habilitação Técnica em Desenvolvimento de Sistemas (SENAI-SP) [2]  
**Unidade Curricular:** Programação para Dispositivos Móveis (Módulo Específico I — Carga Horária: 120 horas) [2]  
**Estratégia Metodológica:** "Aprender Fazendo" via Avaliação Formativa Prática. [2]

---

## 👥 Identificação da Equipe
* **Integrantes:** [Inserir Nome do Aluno 1], [Inserir Nome do Aluno 2]
* **Turma:** [Inserir Turma, ex: 2TDS]
* **Instituição:** SENAI-SP [2]

---

## 🎯 1. O Problema & A Solução
* **O Problema:** Viajantes e mochileiros frequentemente perdem o registro exato de onde tiraram suas fotos favoritas ou esquecem os detalhes da atmosfera local durante seus deslocamentos. Além disso, faltam ferramentas simples que permitam transformar uma foto de viagem compartilhada em uma rota direta e acionável para que outras pessoas visitem o local.
* **A Solução (Waylog):** Uma aplicação móvel híbrida (Rede Social + Diário) desenvolvida em **React Native / Expo SDK 57** utilizando a arquitetura moderna de arquivos do **Expo Router**. O app permite o cadastro local de usuários (via AsyncStorage), oferece um feed rolável interativo (estilo Instagram) alimentado por um banco de dados relacional **SQLite** offline-first, e integra um botão inovador que traça rotas nativas até as coordenadas exatas da postagem utilizando o GPS do dispositivo. [2]

---

## 🎨 2. Seção Visual (Prototipagem UI/UX & Screenshots) [2]

> *Nota para avaliação do docente: Os arquivos de imagem estão rigorosamente anexados na pasta `/docs` do repositório, conforme o checklist de entrega.* [2]

### 📐 Protótipos de Interface (Figma Wireframes) [2]
* **Design System & Telas do App (Modo Claro / Light):**  
  ![Figma Light](./docs/wireframe-figma-light.png)
* **Design System & Telas do App (Modo Escuro / Dark):**  
  ![Figma Dark](./docs/wireframe-figma-dark.png)

### 📱 Capturas de Tela em Execução (Aparelho Físico / Simulador) [2]
* **Tela de Cadastro & Boas-Vindas:**  
  ![Cadastro](./docs/tela-cadastro.png)
* **Home (Feed Estilo Instagram com Posts Simulados):**  
  ![Feed Light](./docs/tela-light-mode.png)
* **Formulário de Nova Postagem (Sensores e Câmera ativos):**  
  ![Formulário](./docs/tela-sensores.png)
* **Tela de Perfil do Usuário (Filtro de publicações próprias):**  
  ![Perfil Dark](./docs/tela-dark-mode.png)

---

## 🗃️ 3. Modelagem de Dados & Arquitetura de Hardware [2]

### A. Banco de Dados Interno Relacional (expo-sqlite) [2]
Abaixo está o esquema de campos e tipos da tabela `viagens`, utilizada para popular o feed principal (com dados mockados/simulados) e persistir as postagens feitas pelo usuário logado: [2]

| Campo | Tipo | Restrições | Descrição |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Identificador único do post |
| `destino` | TEXT | NOT NULL | Nome do local/ponto turístico (Ex: Paris) |
| `pais_cidade` | TEXT | NOT NULL | Cidade e País da viagem |
| `memorias` | TEXT | - | Relato ou legenda da postagem |
| `latitude` | REAL | NOT NULL | Coordenada capturada pelo GPS |
| `longitude` | REAL | NOT NULL | Coordenada capturada pelo GPS |
| `modo_deslocamento`| TEXT | NOT NULL | Estado calculado pelo Acelerômetro |
| `imagem_uri` | TEXT | - | URI/Caminho local da foto capturada |
| `data_hora` | TEXT | NOT NULL | Carimbo de data/hora do registro |
| `autor` | TEXT | NOT NULL | Nome do usuário que fez a postagem |

### B. Persistência de Preferências Chave-Valor (AsyncStorage) [2]
Utilizado para armazenar dados de configuração local e persistência de sessão: [2]
* `@waylog:theme_preference`: Controla o estado global do layout (`light` ou `dark`). [2]
* `@waylog:user_name`: Armazena o nome inserido no cadastro para exibição na Home e Perfil. [2]
* `@waylog:user_email` e `@waylog:user_password`: Validam o fluxo de acesso inicial de 6 dígitos.

### C. Regra de Negócio dos Sensores (Acelerômetro) [2]
Para determinar o "Modo de Deslocamento" do viajante no momento da postagem de forma autônoma, aplicamos o cálculo do vetor de magnitude da aceleração tridimensional baseado na fórmula física: [2]

\[A = \sqrt{x^2 + y^2 + z^2}\]
[2]

* **Regra aplicada:** Se a magnitude A for superior a **1.6G** em um intervalo de monitoramento de 500ms, o aplicativo define o estado como `⚠️ Em movimento (Carro/Ônibus/Trem)`. Caso contrário, assume o estado estável e em repouso `🎯 A pé / Apreciando a Vista`. [2]

---

## 🚀 4. Manual de Instalação e Execução [2]

Siga os passos abaixo para clonar o repositório e testar os módulos nativos utilizando o Expo Go via conexão em túnel. [2]

1. **Clonar o Repositório:**
   ```bash
   git clone https://github.com
   cd nome-do-seu-repositorio
   ```

2. **Instalar Dependências Obrigatórias:**
   ```bash
   npm install
   ```

3. **Executar em Modo Túnel (Obrigatório para Sensores e Câmera no Expo Go):**
   ```bash
   npx expo start --tunnel
   ```
   *Abra o aplicativo Expo Go no seu smartphone e escaneie o QR Code gerado no terminal.* [2]
