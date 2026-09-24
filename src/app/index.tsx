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
import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Accelerometer } from 'expo-sensors';
import * as ImagePicker from 'expo-image-picker';

// Silenciar avisos nativos específicos do ambiente Expo Go
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'Android Push notifications (remote notifications)',
]);

const Notifications = require('expo-notifications');

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Interfaces de Tipo (TypeScript)
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

// Chaves de Armazenamento Local
const KEY_THEME = '@waylog:theme_preference';
const KEY_USER_NAME = '@waylog:user_name';
const KEY_USER_EMAIL = '@waylog:user_email';
const KEY_USER_PASS = '@waylog:user_password';

export default function App() {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
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

        // C. Inicializar SQLite Moderno e Criar Tabelas
        const database = await SQLite.openDatabaseAsync('waylog_db.db');
        setDb(database);

        await database.execAsync(`
          CREATE TABLE IF NOT EXISTS viagens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            destino TEXT NOT NULL,
            pais_cidade TEXT NOT NULL,
            memorias TEXT,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            modo_deslocamento TEXT NOT NULL,
            imagem_uri TEXT,
            data_hora TEXT NOT NULL,
            autor TEXT NOT NULL
          );
        `);

        // D. Popular Feed com Posts Iniciais Simulados (Se o banco estiver vazio)
        const checkRows = await database.getAllAsync<PostViagem>('SELECT id FROM viagens LIMIT 1;');
        if (checkRows.length === 0) {
          await database.runAsync(`
            INSERT INTO viagens (destino, pais_cidade, memorias, latitude, longitude, modo_deslocamento, imagem_uri, data_hora, autor)
            VALUES 
            ('Praia de Lanikai', 'Hawaii, EUA', 'Aproveitando o dia ensolarado nessas águas cristalinas! Vibe perfeita.', 21.3931, -157.7153, '🎯 A pé / Apreciando a Vista', null, '24/09/2026 10:15:32', 'George'),
            ('Torre Eiffel', 'Paris, França', 'Um clássico inesquecível. O pôr do sol aqui de cima é indescritível.', 48.8584, 2.2945, '🎯 A pé / Apreciando a Vista', null, '23/09/2026 18:42:10', 'Mariana');
          `);
        }

        // E. Ativar Sensores em Runtime
        await obterGeolocalizacao();
        iniciarMonitoramentoAcelerometro();

        // F. Carregar Registros para a UI
        await carregarPostagens(database);

      } catch (error) {
        console.error("Falha na inicialização do app:", error);
        Alert.alert("Erro Técnico", "Não foi possível sincronizar os sensores locais.");
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
  async function carregarPostagens(databaseInstance?: SQLite.SQLiteDatabase) {
    const activeDb = databaseInstance || db;
    if (!activeDb) return;
    try {
      const rows = await activeDb.getAllAsync<PostViagem>('SELECT * FROM viagens ORDER BY id DESC;');
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
  async function handlePublicarViagem() {
    if (!destino.trim() || !paisCidade.trim()) {
      Alert.alert('Aviso', 'Insira ao menos o nome do Destino e a Cidade/País.');
      return;
    }
    if (!location) {
      Alert.alert('Ajustando GPS', 'Sincronizando localização por satélite atual...');
      await obterGeolocalizacao();
      return;
    }
    if (!db) return;

    try {
      const timestamp = new Date().toLocaleString('pt-BR');

      await db.runAsync(
        `INSERT INTO viagens (destino, pais_cidade, memorias, latitude, longitude, modo_deslocamento, imagem_uri, data_hora, autor)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          destino.trim(),
          paisCidade.trim(),
          memorias.trim() || 'Sem comentários adicionais.',
          location.coords.latitude,
          location.coords.longitude,
          statusMovimento,
          imagemUri,
          timestamp,
          nomeUsuario
        ]
      );

      // Agendamento da Notificação Local Inteligente (5 segundos)
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

      Alert.alert('Sucesso', 'Sua parada foi eternizada no SQLite e compartilhada!');

      // Limpeza de formulário
      setDestino('');
      setPaisCidade('');
      setMemorias('');
      setImagemUri(null);

      await carregarPostagens();
      setAbaAtual('home'); // Redireciona automaticamente para o feed de fotos
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Falha ao gravar registro no banco SQLite.');
    }
  }

  // Redirecionamento Nativo Externo para o aplicativo de Mapas (Google Maps / Apple Maps)
  function abrirRotaNoMaps(lat: number, lng: number, localNome: string) {
    const label = encodeURIComponent(localNome);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`
    });

    if (url) {
      Linking.canOpenURL(url).then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Erro', 'Não foi possível disparar o aplicativo de mapas externo.');
        }
      });
    }
  }

  // Operação DELETE do CRUD SQLite
  async function handleDeletarRegistro(id: number) {
    if (!db) return;
    try {
      await db.runAsync('DELETE FROM viagens WHERE id = ?;', [id]);
      await carregarPostagens();
      Alert.alert('Removido', 'A publicação foi removida do seu histórico local.');
    } catch (e) {
      console.error(e);
    }
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00B4D8" />
        <Text style={{ marginTop: 12, color: '#64748B' }}>Iniciando ecossistema Waylog...</Text>
      </View>
    );
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
                  <Image source={{ uri: item.imagem_uri }} style={styles.instaImage} />
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
                  
                  {/* Botão de Rota Inteligente integrado ao Maps */}
                  <TouchableOpacity 
                    style={styles.mapsButton}
                    onPress={() => abrirRotaNoMaps(item.latitude, item.longitude, item.destino)}
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
              <Text style={styles.saveRecordText}>💾 Publicar Registro no SQLite</Text>
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

            <Text style={[styles.userPostsTitle, activeTheme.text]}>Minhas Postagens Salvas no SQLite</Text>
            
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