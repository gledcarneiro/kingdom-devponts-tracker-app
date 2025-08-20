import React, { useState, useEffect, createContext, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, SafeAreaView, FlatList } from 'react-native';
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection, query, orderBy, getDocs } from 'firebase/firestore';

// Cria um contexto para compartilhar as instâncias de Auth e Firestore
const FirebaseContext = createContext(null);

// Componente Provedor do Firebase
const FirebaseProvider = ({ children }) => {
  const [auth, setAuth] = useState(null);
  const [db, setDb] = useState(null);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);

  useEffect(() => {
    // Configurações do Firebase
    const firebaseConfig = {
      apiKey: "AIzaSyAted6ls2JRLmlbAWpWnbNqr8lqvRiqNtY",
      authDomain: "kingdom-devponts-tracker.firebaseapp.com",
      projectId: "kingdom-devponts-tracker",
      storageBucket: "kingdom-devponts-tracker.firebasestorage.app",
      messagingSenderId: "285976466192",
      appId: "1:285976466192:web:8c754a66ebb61dca044b95"
    };

    let firebaseAuth;
    let firebaseDb;

    try {
      const app = initializeApp(firebaseConfig);
      // Inicializa a autenticação com persistência
      firebaseAuth = initializeAuth(app, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage),
      });
      // Inicializa o Firestore
      firebaseDb = getFirestore(app);

      setAuth(firebaseAuth);
      setDb(firebaseDb);

    } catch (e) {
      console.error("Fatal error initializing Firebase:", e);
      // Exibe uma mensagem de erro na tela se a inicialização falhar
      setIsFirebaseReady(true);
      return;
    }

    // Listener para o estado de autenticação
    const unsubscribe = onAuthStateChanged(firebaseAuth, (currentUser) => {
      setIsFirebaseReady(true); // O Firebase está pronto para uso
    });

    // Limpeza do listener ao desmontar o componente
    return () => unsubscribe();
  }, []); // Executa apenas uma vez na montagem

  // Se o Firebase ainda não estiver pronto, exibe uma tela de carregamento
  if (!isFirebaseReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6a1b9a" />
        <Text style={styles.loadingText}>Iniciando Firebase...</Text>
      </View>
    );
  }

  // Se o Firebase estiver pronto, fornece os valores para os componentes filhos
  return (
    <FirebaseContext.Provider value={{ auth, db }}>
      {children}
    </FirebaseContext.Provider>
  );
};

// Componente para o formulário de login/cadastro
const AuthForm = ({ email, setEmail, password, setPassword, isLoginView, handleAuth, loading, toggleView, message }) => (
  <KeyboardAvoidingView
    style={styles.container}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  >
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.formCard}>
        <View style={styles.logoContainer}>
          <Image
            source={{ uri: 'https://placehold.co/100x100/6a1b9a/ffffff?text=App' }}
            style={styles.logo}
          />
          <Text style={styles.title}>{isLoginView ? 'Login' : 'Criar Conta'}</Text>
          <Text style={styles.subtitle}>
            {isLoginView ? 'Acesse sua conta para continuar.' : 'Junte-se a nós para uma nova experiência!'}
          </Text>
        </View>

        {message && (
          <Text style={[styles.message, message.type === 'error' ? styles.messageError : styles.messageSuccess]}>
            {message.text}
          </Text>
        )}
        <TextInput
          style={styles.input}
          placeholder="E-mail"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Senha"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TouchableOpacity
          style={styles.button}
          onPress={handleAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{isLoginView ? 'Entrar' : 'Registrar'}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={toggleView}
          style={styles.switchButton}
        >
          <Text style={styles.switchButtonText}>
            {isLoginView ? 'Não tem uma conta? Crie uma!' : 'Já tem uma conta? Faça login!'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  </KeyboardAvoidingView>
);

// Componente do Dashboard
const Dashboard = ({ user, handleSignOut }) => {
  const [devPoints, setDevPoints] = useState(0);
  const [ranking, setRanking] = useState([]);
  const { db } = useContext(FirebaseContext);

  useEffect(() => {
    if (!user || !db) return;

    // Função para buscar os pontos do usuário
    const fetchUserPoints = async () => {
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setDevPoints(docSnap.data().devPoints);
        } else {
          await setDoc(docRef, { email: user.email, devPoints: 0 });
          setDevPoints(0);
        }
      } catch (e) {
        console.error("Erro ao buscar pontos do usuário:", e);
      }
    };

    // Função para buscar o ranking em tempo real
    const fetchRanking = () => {
      const q = query(collection(db, "users"));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const usersList = [];
        querySnapshot.forEach((doc) => {
          usersList.push({ id: doc.id, ...doc.data() });
        });
        usersList.sort((a, b) => b.devPoints - a.devPoints);
        setRanking(usersList);
      });
      return unsubscribe;
    };

    fetchUserPoints();
    const unsubscribeRanking = fetchRanking();

    return () => {
      if (unsubscribeRanking) unsubscribeRanking();
    };
  }, [user, db]);

  const handleAddPoints = async () => {
    if (!user || !db) return;
    try {
      const newPoints = devPoints + 1;
      const docRef = doc(db, "users", user.uid);
      await setDoc(docRef, { devPoints: newPoints }, { merge: true });
      setDevPoints(newPoints);
    } catch (e) {
      console.error("Erro ao adicionar pontos:", e);
    }
  };

  const renderRankingItem = ({ item, index }) => (
    <View style={styles.rankingItem}>
      <Text style={styles.rankingPosition}>{index + 1}.</Text>
      <Text style={styles.rankingEmail}>{item.email}</Text>
      <Text style={styles.rankingPoints}>{item.devPoints} Pontos</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.dashboardContainer}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Bem-vindo, {user?.email}!</Text>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>Sair</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.pointsCard}>
        <Text style={styles.pointsLabel}>Seus DevPoints:</Text>
        <Text style={styles.pointsValue}>{devPoints}</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddPoints}>
          <Text style={styles.addButtonText}>Adicionar 1 Ponto</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.rankingTitle}>Ranking Global</Text>
      <View style={styles.rankingCard}>
        <FlatList
          data={ranking}
          renderItem={renderRankingItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={() => (
            <Text style={styles.rankingPlaceholderText}>
              Nenhum usuário no ranking ainda.
            </Text>
          )}
        />
      </View>
    </SafeAreaView>
  );
};

const App = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoginView, setIsLoginView] = useState(true);
  const [message, setMessage] = useState(null);

  const { auth, db } = useContext(FirebaseContext);

  useEffect(() => {
    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
      });
      return () => unsubscribe();
    }
  }, [auth]);

  const handleAuth = async () => {
    if (!auth) {
      setMessage({ type: 'error', text: 'Firebase não está inicializado.' });
      return;
    }

    if (!email || !password) {
      setMessage({ type: 'error', text: 'Email e senha são obrigatórios.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      if (isLoginView) {
        await signInWithEmailAndPassword(auth, email, password);
        setMessage({ type: 'success', text: 'Login realizado com sucesso!' });
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        setMessage({ type: 'success', text: 'Conta criada com sucesso!' });
      }
    } catch (error) {
      let errorMessage = "Ocorreu um erro. Tente novamente.";
      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = 'O endereço de e-mail é inválido.';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'E-mail ou senha incorretos.';
          break;
        case 'auth/user-not-found':
          errorMessage = 'Usuário não encontrado. Por favor, registre-se.';
          break;
        case 'auth/email-already-in-use':
          errorMessage = 'Este e-mail já está em uso.';
          break;
        case 'auth/weak-password':
          errorMessage = 'A senha deve ter pelo menos 6 caracteres.';
          break;
        default:
          console.error("Authentication error:", error.code, error.message);
          errorMessage = 'Erro desconhecido. Tente novamente.';
      }
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    if (auth) {
      signOut(auth);
    }
  };

  const toggleView = () => {
    setIsLoginView(!isLoginView);
    setEmail('');
    setPassword('');
    setMessage(null);
  };

  if (!auth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6a1b9a" />
        <Text style={styles.loadingText}>Iniciando Firebase...</Text>
      </View>
    );
  }

  return user ? (
    <Dashboard user={user} handleSignOut={handleSignOut} />
  ) : (
    <AuthForm
      key={isLoginView ? 'loginForm' : 'signupForm'}
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      isLoginView={isLoginView}
      handleAuth={handleAuth}
      loading={loading}
      toggleView={toggleView}
      message={message}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formCard: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    padding: 20,
    alignItems: 'center',
    marginTop: 50,
    marginBottom: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6a1b9a',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  header: {
    fontSize: 20,
    fontWeight: '600',
    color: '#444',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    padding: 14,
    marginVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    fontSize: 16,
    color: '#333',
  },
  button: {
    width: '100%',
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#6a1b9a',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  switchButton: {
    marginTop: 15,
  },
  switchButtonText: {
    color: '#6a1b9a',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  message: {
    width: '100%',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  messageError: {
    backgroundColor: '#ffebee',
    color: '#c62828',
  },
  messageSuccess: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
  },
  // Dashboard Styles
  dashboardContainer: {
    flex: 1,
    width: '100%',
    padding: 20,
    backgroundColor: '#f5f5f5',
    paddingTop: 50,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  signOutButton: {
    padding: 10,
    backgroundColor: '#e57373',
    borderRadius: 8,
  },
  signOutButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  pointsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  pointsLabel: {
    fontSize: 18,
    color: '#555',
    marginBottom: 5,
  },
  pointsValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#6a1b9a',
    marginBottom: 10,
  },
  addButton: {
    backgroundColor: '#4caf50',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  rankingTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#444',
    marginBottom: 10,
    textAlign: 'center',
  },
  rankingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    minHeight: 150,
    justifyContent: 'center',
  },
  rankingPlaceholderText: {
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
    paddingVertical: 20,
  },
  rankingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rankingPosition: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6a1b9a',
    width: 30,
  },
  rankingEmail: {
    flex: 1,
    fontSize: 16,
    color: '#555',
  },
  rankingPoints: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4caf50',
  }
});

const AppWrapper = () => (
  <FirebaseProvider>
    <App />
  </FirebaseProvider>
);

export default AppWrapper;
