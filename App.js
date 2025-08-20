import React, { useState, useEffect, createContext, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, SafeAreaView, FlatList } from 'react-native';
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection, query, orderBy, getDocs } from 'firebase/firestore';

// Componentes da sua aplicação
import Dashboard from './Dashboard';
import { firebaseConfig, APP_ID } from './firebaseConfig'; // Importa a configuração centralizada

// Cria um contexto para compartilhar as instâncias de Auth e Firestore
const FirebaseContext = createContext(null);

// Componente Provedor do Firebase
const FirebaseProvider = ({ children }) => {
  const [auth, setAuth] = useState(null);
  const [db, setDb] = useState(null);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);

  useEffect(() => {
    try {
      const app = initializeApp(firebaseConfig);
      const authInstance = initializeAuth(app, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage),
      });
      const dbInstance = getFirestore(app);

      setAuth(authInstance);
      setDb(dbInstance);
      setIsFirebaseReady(true);
    } catch (e) {
      console.error("Erro fatal ao inicializar o Firebase:", e);
    }
  }, []);

  return (
    <FirebaseContext.Provider value={{ auth, db, isFirebaseReady }}>
      {children}
    </FirebaseContext.Provider>
  );
};

// Componente principal que irá consumir o contexto
const MainApp = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { auth, db, isFirebaseReady } = useContext(FirebaseContext);

  // Função para inicializar o ranking com dados de teste
  const initializeRanking = async () => {
    if (!db) {
      console.log("Database não está pronto, pulando a inicialização do ranking.");
      return;
    }

    console.log("Inicializando ranking com dados de teste...");
    const rankingCollectionRef = collection(db, `/artifacts/${APP_ID}/public/data/ranking`);

    // Dados de exemplo
    const testData = [
      { id: "1", name: "League of Dupe", total: 11408.40, kingdomId: "61657b0180bd522963ab5f6f" },
      { id: "2", name: "l é o n", total: 10557.20, kingdomId: "61d5508f97497b11b1a2a707" },
      { id: "3", name: "Warriors of the Sun", total: 9850.15, kingdomId: "62e5508f97497b11b1a2a708" },
      { id: "4", name: "Shadow Hunters", total: 8760.30, kingdomId: "63e5508f97497b11b1a2a709" },
      { id: "5", name: "Mystic Knights", total: 7520.80, kingdomId: "64e5508f97497b11b1a2a710" },
    ];

    try {
      // Verifica se a coleção já tem dados para evitar duplicatas
      const existingDocs = await getDocs(rankingCollectionRef);
      if (existingDocs.empty) {
        await Promise.all(testData.map(async (item) => {
          const docRef = doc(rankingCollectionRef, item.id);
          await setDoc(docRef, item);
        }));
        console.log("Dados de ranking de teste adicionados com sucesso!");
      } else {
        console.log("A coleção de ranking já contém dados. Pulando a adição de dados de teste.");
      }
    } catch (error) {
      console.error("Erro ao adicionar dados de teste:", error);
    }
  };


  useEffect(() => {
    // Só prossegue se o Firebase estiver pronto e as instâncias de auth/db existirem
    if (!isFirebaseReady || !auth || !db) {
      console.log("Firebase não está pronto. Esperando...");
      return;
    }

    console.log("Iniciando processo de autenticação e carregamento...");
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      console.log("Estado de autenticação alterado. Usuário:", authUser ? authUser.email : 'null');
      if (authUser) {
        setUser(authUser);
      } else {
        setUser(null);
      }
      // Garante que o estado de carregamento é atualizado após a verificação
      setLoading(false);
    });

    // Chama a função de inicialização do ranking aqui, fora do onAuthStateChanged
    // para garantir que ela seja executada apenas uma vez.
    initializeRanking();
    
    // Retorna a função de unsubscribe para limpar o listener
    return () => {
      console.log("Limpando o listener de autenticação.");
      unsubscribe();
    };

  }, [isFirebaseReady, auth, db]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6a1b9a" />
        <Text style={styles.loadingText}>Carregando autenticação...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {user ? (
        <Dashboard user={user} handleSignOut={handleSignOut} db={db} />
      ) : (
        <LoginScreen />
      )}
    </View>
  );
};

// Componente de Login placeholder
const LoginScreen = () => {
  const { auth } = useContext(FirebaseContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!auth) {
      setError("Serviço de autenticação não está pronto.");
      return;
    }
    if (!email || !password) {
      setError("Por favor, preencha e-mail e senha.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged no MainApp irá lidar com a navegação para o Dashboard
    } catch (e) {
      setError("E-mail ou senha inválidos. Tente novamente.");
      console.error("Erro no login:", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.loginContainer}>
        <Text style={styles.title}>Bem-vindo!</Text>
        <Text style={styles.subtitle}>Faça login para continuar</Text>

        <TextInput
          style={styles.input}
          placeholder="E-mail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error && <Text style={styles.errorTextLogin}>{error}</Text>}

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Entrar</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// Componente raiz do aplicativo
const App = () => (
  <FirebaseProvider>
    <MainApp />
  </FirebaseProvider>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
  },
  // Estilos para a nova tela de login
  loginContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#6a1b9a',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorTextLogin: {
    color: '#d32f2f',
    marginBottom: 10,
    textAlign: 'center',
  },
});

export default App;
