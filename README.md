# 🌍 Waylog — Rede Social & Diário de Viagens

Aplicativo móvel desenvolvido como projeto autônomo para a Unidade Curricular de **Programação para Dispositivos Móveis**, do curso Técnico em Desenvolvimento de Sistemas do **SENAI-SP**.

O projeto utiliza **React Native com Expo SDK 57**, explorando persistência local, banco de dados SQLite, sensores nativos, câmera, notificações e prototipagem de interface UI/UX.

---

## 👥 Identificação da Equipe

* **Integrante:** Isadora Aquino Moraes
* **Turma:** 2 DEV - OCZ
* **Instituição:** SENAI-SP
* **Unidade Curricular:** Programação para Dispositivos Móveis
* **Carga Horária:** 120 horas
* **Módulo:** Específico I

---

# 🎯 1. O Problema e a Solução

## O Problema

Durante uma viagem, é comum registrar fotografias e experiências sem guardar informações precisas sobre o local em que aquele momento aconteceu. Além disso, quando uma pessoa encontra uma fotografia de um lugar interessante, nem sempre possui uma forma simples de descobrir sua localização e traçar uma rota até ele.

## A Solução

O **Waylog** é uma aplicação móvel que combina características de uma **rede social** com um **diário de viagens**.

O aplicativo permite que o usuário:

* realize seu cadastro localmente;
* visualize publicações em um feed;
* registre suas próprias viagens e memórias;
* capture fotografias utilizando a câmera do dispositivo;
* registre a localização geográfica da publicação;
* identifique o modo de deslocamento por meio do acelerômetro;
* visualize suas publicações no perfil;
* consulte registros armazenados localmente;
* alterne entre os modos **Light** e **Dark**;
* abra uma rota até a localização registrada em uma publicação;
* receba uma notificação local após o cadastro de uma nova viagem.

O projeto foi desenvolvido em **React Native / Expo SDK 57**, utilizando recursos nativos do dispositivo e armazenamento local.

---

# 🎨 2. Prototipagem UI/UX e Screenshots

Os wireframes e as capturas de tela do aplicativo estão disponíveis na pasta [`/docs`](./docs) do repositório.

## 📐 2.1 Wireframes e Design System

### ☀️ Wireframe — Light Mode

![Wireframe Light](./docs/wireframe-figma-light.png)

### 🌙 Wireframe — Dark Mode

![Wireframe Dark](./docs/wireframe-figma-dark.png)

---

## 📱 2.2 Capturas de Tela do Aplicativo

### 👤 Cadastro e Boas-Vindas

![Tela de Cadastro](./docs/tela-cadastro.png)

### 🏠 Home — Feed de Publicações

![Home Light Mode](./docs/tela-light-mode.png)

### 📍 Nova Postagem — Sensores e Localização

![Nova Postagem](./docs/tela-sensores.png)

### 👤 Perfil — Dark Mode

![Perfil Dark Mode](./docs/tela-dark-mode.png)

### 📷 Registro com Fotografia

![Foto anexada ao registro](./docs/tela-foto.png)

### 🗃️ Registros Persistidos no SQLite

![Registros salvos no SQLite](./docs/tela-sqlite.png)

### 📡 Leitura dos Sensores

![Leitura dos sensores](./docs/tela-sensores.png)

> As imagens acima demonstram os principais estados e recursos da aplicação durante sua execução.

---

# 🗃️ 3. Modelagem de Dados e Arquitetura

## A. Banco de Dados Relacional — SQLite

O aplicativo utiliza o **expo-sqlite** para realizar a persistência local das viagens e publicações.

A tabela principal utilizada pelo aplicativo é `viagens`.

| Campo               | Tipo    | Restrições                | Descrição                           |
| :------------------ | :------ | :------------------------ | :---------------------------------- |
| `id`                | INTEGER | PRIMARY KEY AUTOINCREMENT | Identificador único do registro     |
| `destino`           | TEXT    | NOT NULL                  | Nome do local ou ponto turístico    |
| `pais_cidade`       | TEXT    | NOT NULL                  | Cidade e país da viagem             |
| `memorias`          | TEXT    | —                         | Relato ou legenda da publicação     |
| `latitude`          | REAL    | NOT NULL                  | Latitude obtida pelo GPS            |
| `longitude`         | REAL    | NOT NULL                  | Longitude obtida pelo GPS           |
| `modo_deslocamento` | TEXT    | NOT NULL                  | Estado calculado pelo acelerômetro  |
| `imagem_uri`        | TEXT    | —                         | URI/caminho local da imagem         |
| `data_hora`         | TEXT    | NOT NULL                  | Data e horário do registro          |
| `autor`             | TEXT    | NOT NULL                  | Usuário responsável pela publicação |

### Operações realizadas no SQLite

O banco de dados é utilizado para realizar operações de persistência dos registros:

* **INSERT:** criação de novas publicações;
* **SELECT:** carregamento das publicações armazenadas;
* **UPDATE:** atualização dos dados de um registro;
* **DELETE:** exclusão de registros.

As operações utilizam a API assíncrona do `expo-sqlite`.

---

## B. Persistência de Preferências — AsyncStorage

O **AsyncStorage** é utilizado para armazenar informações que precisam permanecer disponíveis localmente entre as execuções do aplicativo.

### Chaves utilizadas

| Chave                      | Finalidade                                         |
| :------------------------- | :------------------------------------------------- |
| `@waylog:theme_preference` | Armazena a preferência de tema Light ou Dark       |
| `@waylog:user_name`        | Armazena o nome do usuário                         |
| `@waylog:user_email`       | Armazena o e-mail cadastrado                       |
| `@waylog:user_password`    | Armazena a informação utilizada no fluxo de acesso |

A persistência dessas informações permite manter as preferências e os dados do usuário mesmo após o encerramento do aplicativo.

---

# 📡 4. Sensores e Recursos Nativos

## 📍 4.1 Geolocalização — GPS

O aplicativo utiliza o **expo-location** para obter a localização atual do dispositivo.

Durante o processo de criação de uma publicação:

1. o aplicativo solicita a permissão de localização;
2. verifica se a permissão foi concedida;
3. obtém a posição atual;
4. registra latitude e longitude;
5. armazena essas informações junto à publicação no SQLite.

As coordenadas também são utilizadas para permitir a criação de uma rota até o local registrado.

---

## 📱 4.2 Acelerômetro

O aplicativo utiliza o **expo-sensors** para realizar a leitura do acelerômetro do dispositivo.

A magnitude da aceleração é calculada utilizando a fórmula:

**A = √(x² + y² + z²)**

A leitura é realizada em intervalos de **500 ms**.

### Regra de negócio

A partir da magnitude calculada:

* quando **A > 1,6G**, o aplicativo identifica movimento do dispositivo e registra o estado como:

  `⚠️ Em movimento (Carro/Ônibus/Trem)`

* quando **A ≤ 1,6G**, o aplicativo considera o dispositivo em estado estável e registra:

  `🎯 A pé / Apreciando a Vista`

O resultado dessa leitura é armazenado no campo `modo_deslocamento` da tabela `viagens`.

---

## 📷 4.3 Câmera e Multimídia

O aplicativo utiliza o **expo-image-picker** para acessar a câmera do dispositivo.

Ao criar uma publicação, o usuário pode:

1. abrir a câmera;
2. capturar uma fotografia;
3. visualizar a imagem;
4. associar a fotografia à publicação;
5. armazenar sua URI no SQLite.

O banco armazena o **caminho/URI da imagem**, em vez de armazenar o arquivo binário diretamente no banco de dados.

---

## 🔔 4.4 Notificações Locais

O aplicativo utiliza o **expo-notifications** para emitir uma notificação local após o cadastro de uma nova publicação.

A notificação é programada para ocorrer **5 segundos após o registro**, permitindo demonstrar o funcionamento do recurso de notificações locais.

---

# 🏗️ 5. Arquitetura da Aplicação

O Waylog utiliza uma arquitetura baseada em **React Native / Expo**, integrando a interface da aplicação aos recursos nativos e à persistência local.

## Interface

A interface apresenta:

* telas de cadastro;
* feed de publicações;
* criação de novas viagens;
* perfil do usuário;
* modo Light;
* modo Dark.

## Persistência

A aplicação utiliza dois mecanismos principais:

### AsyncStorage

Utilizado para:

* preferências;
* informações locais do usuário;
* tema.

### SQLite

Utilizado para armazenar:

* viagens;
* publicações;
* localização;
* modo de deslocamento;
* URI das imagens;
* data e horário;
* autor.

## Recursos Nativos

O aplicativo integra:

* **GPS:** `expo-location`
* **Acelerômetro:** `expo-sensors`
* **Câmera:** `expo-image-picker`
* **Notificações:** `expo-notifications`

---

# 🚀 6. Manual de Instalação e Execução

## 6.1 Pré-requisitos

Para executar o projeto, é necessário possuir:

* Node.js instalado;
* npm;
* aplicativo Expo Go em um dispositivo compatível;
* conexão com a internet.

---

## 6.2 Clonar o Repositório

No terminal, execute:

```bash
git clone https://github.com/Isaa-moraes/WayLog.git
```

Depois, entre na pasta do projeto:

```bash
cd WayLog
```

---

## 6.3 Instalar as Dependências

Execute:

```bash
npm install
```

---

## 6.4 Executar o Aplicativo

Para iniciar o projeto utilizando o modo Tunnel:

```bash
npx expo start --tunnel
```

Após o início do servidor:

1. abra o **Expo Go** no smartphone;
2. leia o QR Code apresentado pelo Expo;
3. aguarde o carregamento da aplicação;
4. conceda as permissões solicitadas pelo aplicativo para localização, câmera e notificações.

> **Importante:** não utilize `expo start --web` para a avaliação dos recursos nativos, pois a atividade exige a utilização dos módulos de dispositivo móvel.

---

# 📦 7. Tecnologias e Bibliotecas

O projeto foi desenvolvido utilizando:

* **React Native**
* **Expo SDK 57**
* **TypeScript**
* **Expo Router**
* **expo-sqlite**
* **@react-native-async-storage/async-storage**
* **expo-location**
* **expo-sensors**
* **expo-image-picker**
* **expo-notifications**
* **expo-device**
* **Git / GitHub**

---

# 🎓 8. Relação com os Requisitos da Atividade

O projeto Waylog contempla os principais conhecimentos e capacidades previstos na atividade:

| Requisito                  | Implementação no Waylog                                |
| :------------------------- | :----------------------------------------------------- |
| UI/UX                      | Wireframes e design Light/Dark                         |
| React Native / Expo SDK 57 | Aplicativo móvel desenvolvido com Expo                 |
| AsyncStorage               | Preferências e dados locais do usuário                 |
| SQLite                     | Persistência das viagens e publicações                 |
| CRUD                       | Operações de criação, consulta, atualização e exclusão |
| GPS                        | Registro de latitude e longitude                       |
| Acelerômetro               | Cálculo da magnitude e identificação do deslocamento   |
| Câmera                     | Captura e associação de fotografias                    |
| Notificações               | Notificação local após cadastro                        |
| Git/GitHub                 | Versionamento e publicação do projeto                  |
| README                     | Documentação técnica e manual de execução              |

---

# 👩‍💻 9. Autoria

**Isadora Aquino Moraes**

Projeto desenvolvido para a Unidade Curricular de **Programação para Dispositivos Móveis — SENAI-SP**.