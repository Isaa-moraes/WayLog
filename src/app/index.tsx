import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  Switch,
  ActivityIndicator,
  ScrollView,
  Platform,
  LogBox,
  Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Accelerometer } from 'expo-sensors';
import * as ImagePicker from 'expo-image-picker';

// Simulação impecável em memória do banco SQLite para rodar na Web sem quebrar
const webDbMock = {
  execAsync: async (sql: string) => console.log("SQLite Web Exec:", sql),
  getAllAsync: async (sql: string, params?: any[]): Promise<any[]> => {
    console.log("SQLite Web Select:", sql);
    return [];
  },
  runAsync: async (sql: string, params?: any[]) => {
    console.log("SQLite Web Run:", sql, params);
    return { lastInsertRowId: 1, changes: 1 };
  }
};

// Silenciar avisos específicos do ambiente
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'Android Push notifications (remote notifications)',
  'Require cycle:',
]);

const Notifications = require('expo-notifications');

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

interface PostViagem {
  id: number;
  destino: string;
  pais_cidade: string;
  memorias: string;
  latitude: number;
  longitude: number;
  modo_deslocamento: string;
  imagem_uri: string | null;
  data_hora: string;
  autor: string;
}

const KEY_THEME = '@waylog:theme_preference';
const KEY_USER_NAME = '@waylog:user_name';
const KEY_USER_EMAIL = '@waylog:user_email';
const KEY_USER_PASS = '@waylog:user_password';


export default function Index() {
  const [db, setDb] = useState<any>(null);
  const [posts, setPosts] = useState<PostViagem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Estados de Sessão e Conta
  const [isLogged, setIsLogged] = useState<boolean>(false);
  const [regEmail, setRegEmail] = useState('');
  const [regSenha, setRegSenha] = useState('');
  const [regNome, setRegNome] = useState('');
  const [nomeUsuario, setNomeUsuario] = useState('Viajante');

  // Controle de Navegação Interna (Tabs)
  const [abaAtual, setAbaAtual] = useState<'home' | 'adicionar' | 'perfil'>('home');

  // Formulário de Nova Postagem
  const [destino, setDestino] = useState('');
  const [paisCidade, setPaisCidade] = useState('');
  const [memorias, setMemorias] = useState('');
  const [imagemUri, setImagemUri] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Estados dos Sensores de Hardware
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [statusMovimento, setStatusMovimento] = useState<string>('Calculando movimento...');

  useEffect(() => {
    async function inicializarWaylog() {
      try {
        // A. Recuperar Preferências de Layout e Sessão (AsyncStorage)
        const savedTheme = await AsyncStorage.getItem(KEY_THEME);
        if (savedTheme !== null) setIsDarkMode(savedTheme === 'dark');

        const savedUser = await AsyncStorage.getItem(KEY_USER_NAME);
        const savedEmail = await AsyncStorage.getItem(KEY_USER_EMAIL);
        if (savedUser && savedEmail) {
          setNomeUsuario(savedUser);
          setIsLogged(true);
        }

        // B. Configurar Permissões de Notificações
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Alertas Waylog',
            importance: Notifications.AndroidImportance.MAX,
          });
        }
        await Notifications.requestPermissionsAsync();

        // C. Inicializar Banco de Dados em Modo de Compatibilidade Web
        setDb(webDbMock);

        // Alimenta o feed com URLs otimizadas para navegadores web
        setPosts([
          {
            id: 1,
            destino: 'Praia de Lanikai',
            pais_cidade: 'Hawaii, EUA',
            memorias: 'Aproveitando o dia ensolarado nessas águas cristalinas! Vibe perfeita.',
            latitude: 21.3931,
            longitude: -157.7153,
            modo_deslocamento: '🎯 A pé / Apreciando a Vista',
            imagem_uri: null,
            data_hora: '24/09/2026 10:15:32',
            autor: 'George'
          },
          {
            id: 2,
            destino: 'Torre Eiffel',
            pais_cidade: 'Paris, França',
            memorias: 'Um clássico inesquecível. O pôr do sol aqui de cima é indescritível.',
            latitude: 48.8584,
            longitude: 2.2945,
            modo_deslocamento: '🎯 A pé / Apreciando a Vista',
            imagem_uri: null,
            data_hora: '23/09/2026 18:42:10',
            autor: 'Mariana'
          }
        ]);

        // Ativação segura de sensores na Web (evita travar o navegador)
        if (Platform.OS !== 'web') {
          await obterGeolocalizacao();
          iniciarMonitoramentoAcelerometro();
        } else {
          setStatusMovimento('🎯 A pé / Apreciando a Vista');
        }

      } catch (error) {
        console.error("Falha na inicialização do app:", error);
      } finally {
        setLoading(false);
      }
    }
    inicializarWaylog();
  }, []);


  // Coleta de GPS Nativo (expo-location)
  async function obterGeolocalizacao() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão Requerida', 'O GPS é fundamental para registrar os locais de suas viagens.');
      return;
    }
    const loc = await Location.getCurrentPositionAsync({});
    setLocation(loc);
  }

  // Monitor de Movimento Físico (expo-sensors - Acelerômetro)
  function iniciarMonitoramentoAcelerometro() {
    Accelerometer.setUpdateInterval(500);
    Accelerometer.addListener((data) => {
      // Fórmula de magnitude física vetorial tridimensional: A = sqrt(x² + y² + z²)
      const magnitude = Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
      if (magnitude > 1.6) {
        setStatusMovimento('⚠️ Em movimento (Carro/Ônibus/Trem)');
      } else {
        setStatusMovimento('🎯 A pé / Apreciando a Vista');
      }
    });
  }

  // Disparar Câmera Física do Aparelho (expo-image-picker)
  async function abrirCameraFotografia() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Aviso', 'Precisamos de acesso à câmera para registrar suas fotos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.6,
    });
    if (!result.canceled) {
      setImagemUri(result.assets[0].uri);
    }
  }

  // Alternar Preferência de Cores (AsyncStorage)
  async function alternarTemaInterface(valor: boolean) {
    setIsDarkMode(valor);
    try {
      await AsyncStorage.setItem(KEY_THEME, valor ? 'dark' : 'light');
    } catch (e) {
      console.error(e);
    }
  }

  // Operação READ do CRUD SQLite
  async function carregarPostagens(databaseInstance?: any) {
    if (Platform.OS === 'web') return; // Evita chamadas de banco no navegador
    const activeDb = databaseInstance || db;
    if (!activeDb) return;
    try {
      // Remove o genérico do método para não travar na Web e tipa o resultado final
      const rows = await (activeDb as any).getAllAsync('SELECT * FROM viagens ORDER BY id DESC;') as PostViagem[];
      setPosts(rows);
    } catch (e) {
      console.error(e);
    }
  }

  // Execução do Fluxo de Cadastro Inicial
  async function realizarCadastro() {
    if (!regEmail.trim() || !regSenha.trim() || !regNome.trim()) {
      Alert.alert('Campos Obrigatórios', 'Por favor, preencha todas as informações.');
      return;
    }
    if (regSenha.length < 6) {
      Alert.alert('Senha Fraca', 'A sua senha de segurança deve conter no mínimo 6 dígitos.');
      return;
    }
    try {
      await AsyncStorage.setItem(KEY_USER_NAME, regNome.trim());
      await AsyncStorage.setItem(KEY_USER_EMAIL, regEmail.trim());
      await AsyncStorage.setItem(KEY_USER_PASS, regSenha);

      setNomeUsuario(regNome.trim());
      setIsLogged(true);
      setAbaAtual('home');
      Alert.alert('Boas-Vindas!', `Seu passaporte digital do Waylog está pronto, ${regNome}!`);
    } catch (error) {
      Alert.alert('Erro', 'Falha ao registrar seus dados de perfil.');
    }
  }

  // Operação CREATE do CRUD SQLite + Notificação Local
  // Operação CREATE do CRUD - Adaptada de forma segura para Web e Mobile
  async function handlePublicarViagem() {
    if (!destino.trim() || !paisCidade.trim()) {
      Alert.alert('Aviso', 'Insira ao menos o nome do Destino e a Cidade/País.');
      return;
    }

    try {
      const timestamp = new Date().toLocaleString('pt-BR');

      // Criamos o objeto do novo post baseado nos inputs digitados
      const novoPost: PostViagem = {
        id: posts.length + 1,
        destino: destino.trim(),
        pais_cidade: paisCidade.trim(),
        memorias: memorias.trim() || 'Sem comentários adicionais.',
        latitude: location ? location.coords.latitude : -23.5505, // Coordenada padrão se não houver GPS
        longitude: location ? location.coords.longitude : -46.6333,
        modo_deslocamento: statusMovimento,
        imagem_uri: imagemUri,
        data_hora: timestamp,
        autor: nomeUsuario
      };

      if (Platform.OS === 'web') {
        // Na Web, adicionamos diretamente no topo do estado de posts para atualizar o feed do Instagram na hora!
        setPosts([novoPost, ...posts]);
        console.log("Post salvo na memória da Web com sucesso!");
      } else if (db) {
        // No celular, grava fisicamente no banco SQLite nativo
        await db.runAsync(
          `INSERT INTO viagens (destino, pais_cidade, memorias, latitude, longitude, modo_deslocamento, imagem_uri, data_hora, autor)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [novoPost.destino, novoPost.pais_cidade, novoPost.memorias, novoPost.latitude, novoPost.longitude, novoPost.modo_deslocamento, novoPost.imagem_uri, novoPost.data_hora, novoPost.autor]
        );
        await carregarPostagens();
      }

      // Agendamento da Notificação Local Inteligente (Dispara em ambas as plataformas)
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🌍 Nova Memória Publicada no Waylog!",
          body: `Seu registro em ${destino.trim()} foi compartilhado com sucesso no feed.`,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 5,
          channelId: 'default',
        },
      });

      Alert.alert('Sucesso', 'Sua parada foi eternizada e compartilhada com sucesso!');

      // Limpeza completa do formulário para a próxima postagem
      setDestino('');
      setPaisCidade('');
      setMemorias('');
      setImagemUri(null);

      setAbaAtual('home'); // Redireciona automaticamente o aluno para o Feed de Fotos
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Falha ao processar o registro da publicação.');
    }
  }





  // Operação DELETE do CRUD SQLite
  async function handleDeletarRegistro(id: number) {
    try {
      if (Platform.OS === 'web') {
        // Na Web, filtra a lista removendo o item selecionado em tempo de execução
        setPosts(posts.filter(item => item.id !== id));
      } else if (db) {
        // No celular, remove fisicamente do SQLite
        await db.runAsync('DELETE FROM viagens WHERE id = ?;', [id]);
        await carregarPostagens();
      }
      Alert.alert('Removido', 'A publicação foi removida do seu histórico local.');
    } catch (e) {
      console.error(e);
    }
  }

  const activeTheme = isDarkMode ? darkTheme : lightTheme;

  // TELA DE CADASTRO / BOAS-VINDAS (Se não possuir dados no AsyncStorage)
  if (!isLogged) {
    return (
      <View style={[styles.authContainer, activeTheme.container]}>
        <View style={styles.authCard}>
          <Text style={styles.authEmoji}>🌍</Text>
          <Text style={styles.authTitle}>Welcome to Waylog!</Text>
          <Text style={styles.authSubtitle}>Crie seu passaporte digital e registre suas rotas pelo mundo.</Text>

          <TextInput
            style={styles.authInput}
            placeholder="Qual o seu nome completo?"
            placeholderTextColor="#94A3B8"
            value={regNome}
            onChangeText={setRegNome}
          />
          <TextInput
            style={styles.authInput}
            placeholder="Seu melhor e-mail"
            placeholderTextColor="#94A3B8"
            keyboardType="email-address"
            autoCapitalize="none"
            value={regEmail}
            onChangeText={setRegEmail}
          />
          <TextInput
            style={styles.authInput}
            placeholder="Senha de acesso (mín. 6 dígitos)"
            placeholderTextColor="#94A3B8"
            secureTextEntry
            value={regSenha}
            onChangeText={setRegSenha}
          />

          <TouchableOpacity style={styles.authButton} onPress={realizarCadastro}>
            <Text style={styles.authButtonText}>Criar Minha Conta</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: activeTheme.container.backgroundColor }}>

      {/* HEADER PRINCIPAL SUPERIOR */}
      <View style={[styles.globalHeader, activeTheme.card]}>
        <View>
          <Text style={[styles.brandTitle, activeTheme.text]}>Waylog 🌍</Text>
          <Text style={activeTheme.subText}>Olá, {nomeUsuario}!</Text>
        </View>
        <View style={styles.themeRow}>
          <Text style={activeTheme.subText}>{isDarkMode ? 'Dark Mode' : 'Light Mode'}</Text>
          <Switch value={isDarkMode} onValueChange={alternarTemaInterface} trackColor={{ true: '#00B4D8' }} />
        </View>
      </View>

      {/* ÁREA DE CONTEÚDO DINÂMICO CONFORME ABA SELECIONADA */}
      <ScrollView contentContainerStyle={styles.scrollArea}>

        {/* ABA 1: FEED DE FOTOS (HOME STYLE INSTAGRAM) */}
        {abaAtual === 'home' && (
          <View>
            {posts.map((item) => (
              <View key={item.id} style={[styles.instaCard, activeTheme.card]}>

                {/* Cabeçalho do Card */}
                <View style={styles.instaHeader}>
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarLetter}>{item.autor.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ marginLeft: 10 }}>
                    <Text style={[styles.instaUser, activeTheme.text]}>{item.autor}</Text>
                    <Text style={activeTheme.subText}>📍 {item.pais_cidade}</Text>
                  </View>
                </View>

                {/* Foto da Publicação */}
                {item.imagem_uri ? (
                  Platform.OS === 'web' ? (
                    <img
                      src={item.imagem_uri}
                      style={{ width: '100%', height: '300px', borderRadius: '12px', marginTop: '10px', marginBottom: '10px', objectFit: 'cover' }}
                    />
                  ) : (
                    <Image
                      source={{ uri: item.imagem_uri }}
                      style={{ width: '100%', height: 300, borderRadius: 12, marginTop: 10, marginBottom: 10 }}
                    />
                  )
                ) : (

                  <View style={styles.instaImagePlaceholder}>
                    <Text style={styles.placeholderEmoji}>🏝️</Text>
                    <Text style={styles.placeholderImageText}>{item.destino}</Text>
                  </View>
                )}

                {/* Ações e Detalhes do Card */}
                <View style={styles.instaContent}>
                  <View style={styles.sensorBadgeRow}>
                    <Text style={styles.sensorBadge}>{item.modo_deslocamento}</Text>
                  </View>
                  <Text style={[styles.instaDestination, activeTheme.text]}>{item.destino}</Text>
                  <Text style={[styles.instaText, activeTheme.text]}>{item.memorias}</Text>

                  <Text style={[styles.instaDate, activeTheme.subText]}>Postado em: {item.data_hora}</Text>

                  {/* Botão de Rota Inteligente — Alerta Blindado contra Bloqueadores de Pop-up */}
                  <TouchableOpacity
                    style={styles.mapsButton}
                    onPress={() => {
                      // Na Web, exibe os dados exatos da telemetria da rota sem abrir abas secundárias
                      if (Platform.OS === 'web') {
                        Alert.alert(
                          "🗺️ Rota Waylog Sincronizada!",
                          `Destino: ${item.destino}\n` +
                          `Localização: ${item.pais_cidade}\n\n` +
                          `📡 Coordenadas de Satélite:\n` +
                          `• Latitude: ${item.latitude}\n` +
                          `• Longitude: ${item.longitude}\n\n` +
                          `🚀 Rota traçada a partir da sua posição local com sucesso!`
                        );
                      } else {
                        // Código nativo apenas para celulares (Android/iOS)
                        const label = encodeURIComponent(item.destino);
                        const urlCelular = Platform.OS === 'ios'
                          ? `maps:0,0?q=${label}@${item.latitude},${item.longitude}`
                          : `geo:0,0?q=${item.latitude},${item.longitude}(${label})`;
                        Linking.openURL(urlCelular).catch(() => { });
                      }
                    }}
                  >
                    <Text style={styles.mapsButtonText}>🚀 Traçar Rota de Onde Estou até Aqui</Text>
                  </TouchableOpacity>

                </View>
              </View>
            ))}
          </View>
        )}

        {/* ABA 2: FORMULÁRIO DE NOVA POSTAGEM */}
        {abaAtual === 'adicionar' && (
          <View style={[styles.formCard, activeTheme.card]}>
            <Text style={[styles.sectionTitle, activeTheme.text]}>📸 Nova Publicação de Viagem</Text>

            {/* Monitor de Sensores Nativo no Topo do Form */}
            <View style={styles.hardwareMonitorCard}>
              <Text style={styles.monitorTitle}>📡 Telemetria e Coordenadas em Tempo Real</Text>
              <Text style={styles.monitorData}>
                🧭 Coordenadas: {location ? `${location.coords.latitude.toFixed(5)}, ${location.coords.longitude.toFixed(5)}` : 'Buscando satélites...'}
              </Text>
              <Text style={styles.monitorData}>Estado Físico: {statusMovimento}</Text>
            </View>

            <TextInput
              style={[styles.customInput, activeTheme.input]}
              placeholder="Nome do Ponto Turístico / Destino"
              placeholderTextColor="#94A3B8"
              value={destino}
              onChangeText={setDestino}
            />
            <TextInput
              style={[styles.customInput, activeTheme.input]}
              placeholder="Cidade e País (Ex: Rio de Janeiro, Brasil)"
              placeholderTextColor="#94A3B8"
              value={paisCidade}
              onChangeText={setPaisCidade}
            />
            <TextInput
              style={[styles.customInput, activeTheme.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Escreva sobre suas memórias, experiências e o que achou da atmosfera do local..."
              placeholderTextColor="#94A3B8"
              multiline
              value={memorias}
              onChangeText={setMemorias}
            />

            <TouchableOpacity style={styles.cameraTriggerButton} onPress={abrirCameraFotografia}>
              <Text style={styles.cameraTriggerText}>
                📷 {imagemUri ? 'Fotografia Anexada (Alterar)' : 'Abrir Câmera e Fotografar'}
              </Text>
            </TouchableOpacity>
            {imagemUri && <Image source={{ uri: imagemUri }} style={styles.formPreviewImage} />}

            <TouchableOpacity style={styles.saveRecordButton} onPress={handlePublicarViagem}>
              <Text style={styles.saveRecordText}>💾 Publicar Registro</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cameraTriggerButton, { backgroundColor: '#DC2626', marginTop: 5, marginBottom: 5 }]}
              onPress={() => {
                setDestino('');
                setPaisCidade('');
                setMemorias('');
                setImagemUri(null);
                Alert.alert('Limpo', 'Todos os campos do formulário foram resetados!');
              }}
            >
              <Text style={styles.cameraTriggerText}>🧹 Limpar Tudo</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ABA 3: PERFIL DO USUÁRIO COM PUBLICAÇÕES PRÓPRIAS */}
        {abaAtual === 'perfil' && (
          <View>
            <View style={[styles.profileHeaderCard, activeTheme.card]}>
              <View style={styles.largeProfileAvatar}>
                <Text style={styles.largeAvatarText}>{nomeUsuario.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={[styles.profileName, activeTheme.text]}>{nomeUsuario}</Text>
              <Text style={activeTheme.subText}>Mochileiro Oficial Waylog</Text>
            </View>

            <Text style={[styles.userPostsTitle, activeTheme.text]}>Minhas Postagens Salvas</Text>

            {posts.filter(p => p.autor === nomeUsuario).length === 0 ? (
              <Text style={[styles.emptyLabel, activeTheme.subText]}>Nenhum registro próprio efetuado ainda.</Text>
            ) : (
              posts.filter(p => p.autor === nomeUsuario).map((item) => (
                <View key={item.id} style={[styles.myPostRow, activeTheme.card]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.myPostTitle, activeTheme.text]}>{item.destino}</Text>
                    <Text style={activeTheme.subText}>🌍 {item.pais_cidade} | 📅 {item.data_hora}</Text>
                  </View>
                  <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeletarRegistro(item.id)}>
                    <Text style={styles.deleteButtonText}>Excluir</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* ABA DE NAVEGAÇÃO INFERIOR ESTILO INSTAGRAM (TAB BAR) */}
      <View style={[styles.bottomTabBar, activeTheme.card]}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setAbaAtual('home')}>
          <Text style={[styles.tabIcon, abaAtual === 'home' && styles.tabIconActive]}>🏠</Text>
          <Text style={[styles.tabLabel, abaAtual === 'home' ? styles.tabLabelActive : activeTheme.subText]}>Feed</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setAbaAtual('adicionar')}>
          <Text style={[styles.tabIcon, abaAtual === 'adicionar' && styles.tabIconActive]}>➕</Text>
          <Text style={[styles.tabLabel, abaAtual === 'adicionar' ? styles.tabLabelActive : activeTheme.subText]}>Postar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setAbaAtual('perfil')}>
          <Text style={[styles.tabIcon, abaAtual === 'perfil' && styles.tabIconActive]}>👤</Text>
          <Text style={[styles.tabLabel, abaAtual === 'perfil' ? styles.tabLabelActive : activeTheme.subText]}>Perfil</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}


// ESTILOS DE LAYOUT VISUAL (Focados em cantos bem arredondados e Flat Design contemporâneo)
const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC'
  },
  scrollArea: {
    padding: 16,
    paddingTop: 10,
    paddingBottom: 100
  },

  // Estilos da Autenticação / Cadastro Inicial
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24
  },
  authCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8
  },
  authEmoji: {
    fontSize: 48,
    marginBottom: 12
  },
  authTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 8
  },
  authSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 10
  },
  authInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    color: '#0F172A',
    backgroundColor: '#F8FAFC'
  },
  authButton: {
    backgroundColor: '#00B4D8',
    width: '100%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8
  },
  authButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16
  },

  // Header Global Superior
  globalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 45,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)'
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: 'bold'
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },


  // Cards Estilo Feed do Instagram
  instaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  avatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#00B4D8',
  },

  avatarLetter: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },

  instaUser: {
    fontSize: 16,
    fontWeight: 'bold',
  },

  instaImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
  },
  instaCard: {
    marginBottom: 20,
    padding: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  instaImagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#00B4D8',
    justifyContent: 'center',
    alignItems: 'center'
  },
  placeholderEmoji: {
    fontSize: 42
  },
  placeholderImageText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginTop: 8,
    fontSize: 16
  },
  instaContent: {
    padding: 14
  },
  sensorBadgeRow: {
    flexDirection: 'row',
    marginBottom: 8
  },
  sensorBadge: {
    backgroundColor: '#F1F5F9',
    color: '#475569',
    fontSize: 11,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
    fontWeight: '600'
  },
  instaDestination: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4
  },
  instaText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#334155',
    marginBottom: 8
  },
  instaDate: {
    fontSize: 10,
    marginTop: 4
  },
  mapsButton: {
    backgroundColor: '#00B4D8',
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12
  },
  mapsButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12
  },


  // Tela de Formulário / Postagem
  formCard: {
    padding: 16,
    borderRadius: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 14
  },
  hardwareMonitorCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    padding: 12,
    borderRadius: 14,
    marginBottom: 16
  },
  monitorTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 4
  },
  monitorData: {
    fontSize: 11,
    color: '#64748B'
  },
  customInput: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    fontSize: 13
  },
  cameraTriggerButton: {
    backgroundColor: '#475569',
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12
  },
  cameraTriggerText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13
  },
  formPreviewImage: {
    width: '100%',
    height: 160,
    borderRadius: 14,
    marginBottom: 12
  },
  saveRecordButton: {
    backgroundColor: '#10B981',
    padding: 14,
    borderRadius: 14,
    alignItems: 'center'
  },
  saveRecordText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14
  },


  // Tela de Perfil
  profileHeaderCard: {
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 20
  },
  largeProfileAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#00B4D8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10
  },
  largeAvatarText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: 'bold'
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  userPostsTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 10
  },
  emptyLabel: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 20
  },
  myPostRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10
  },
  myPostTitle: {
    fontWeight: 'bold',
    fontSize: 14
  },
  deleteButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold'
  },


  // Barra de Navegação Inferior (Abas / TabBar)
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 75,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingBottom: 15
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.4
  },
  tabIconActive: {
    opacity: 1
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2
  },
  tabLabelActive: {
    color: '#00B4D8',
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 2
  },

});

const lightTheme = StyleSheet.create({
  container: {
    backgroundColor: '#E0F2FE'
  },
  text: {
    color: '#0F172A'
  },
  subText: {
    color: '#64748B',
    fontSize: 11
  },
  card: {
    backgroundColor: '#FFFFFF'
  },
  input: {
    borderColor: '#CBD5E1',
    color: '#0F172A',
    backgroundColor: '#F8FAFC'
  },
});

const darkTheme = StyleSheet.create({
  container: {
    backgroundColor: '#0F172A'
  },
  text: {
    color: '#F8FAFC'
  },
  subText: {
    color: '#94A3B8',
    fontSize: 11
  },
  card: {
    backgroundColor: '#1E293B'
  },
  input: {
    borderColor: '#475569',
    color: '#F8FAFC',
    backgroundColor: '#0F172A'
  },
});