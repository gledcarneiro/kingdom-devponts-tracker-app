import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, SafeAreaView, FlatList } from 'react-native';
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, doc, setDoc, onSnapshot, collection, query, orderBy, getDocs } from 'firebase/firestore';

// Importa o componente Dashboard
import Dashboard from './Dashboard';
// Importa o contexto do novo arquivo
import { FirebaseContext } from './FirebaseContext';

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
      setIsFirebaseReady(true);
      return;
    }

    // Listener para o estado de autenticação
    const unsubscribe = onAuthStateChanged(firebaseAuth, (currentUser) => {
      setIsFirebaseReady(true); // O Firebase está pronto para uso
    });

    // Limpeza do listener ao desmontar o componente
    return () => unsubscribe();
  }, []);

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

// Componente principal
export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoginView, setIsLoginView] = useState(true);
  const [message, setMessage] = useState(null);

  return (
    <FirebaseProvider>
      <AppContent
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        loading={loading}
        setLoading={setLoading}
        user={user}
        setUser={setUser}
        isLoginView={isLoginView}
        setIsLoginView={setIsLoginView}
        message={message}
        setMessage={setMessage}
      />
    </FirebaseProvider>
  );
}

// Componente filho para renderizar o AuthForm ou o Dashboard
const AppContent = ({ email, setEmail, password, setPassword, loading, setLoading, user, setUser, isLoginView, setIsLoginView, message, setMessage }) => {
  const { auth, db } = useContext(FirebaseContext);

  useEffect(() => {
    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
      });
      return () => unsubscribe();
    }
  }, [auth, setUser]);

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
        case 'auth/invalid-email': errorMessage = 'O endereço de e-mail é inválido.'; break;
        case 'auth/invalid-credential': errorMessage = 'E-mail ou senha incorretos.'; break;
        case 'auth/user-not-found': errorMessage = 'Usuário não encontrado. Por favor, registre-se.'; break;
        case 'auth/email-already-in-use': errorMessage = 'Este e-mail já está em uso.'; break;
        case 'auth/weak-password': errorMessage = 'A senha deve ter pelo menos 6 caracteres.'; break;
        default: console.error("Authentication error:", error.code, error.message); errorMessage = 'Erro desconhecido. Tente novamente.';
      }
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // Redireciona para a tela de login ao sair
      setUser(null);
      setEmail('');
      setPassword('');
      setIsLoginView(true);
    } catch (e) {
      console.error("Erro ao fazer logout:", e);
    }
  };

  // Renderiza a tela de login/cadastro ou o dashboard com base no estado do usuário
  return user ? (
    <Dashboard user={user} handleSignOut={handleSignOut} />
  ) : (
    <AuthForm
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      isLoginView={isLoginView}
      handleAuth={handleAuth}
      loading={loading}
      toggleView={() => {
        setIsLoginView(!isLoginView);
        setMessage(null);
      }}
      message={message}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f7',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  formCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    color: '#333',
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
  switchButton: {
    marginTop: 20,
    alignSelf: 'center',
  },
  switchButtonText: {
    color: '#6a1b9a',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  message: {
    textAlign: 'center',
    marginBottom: 15,
    padding: 10,
    borderRadius: 8,
  },
  messageError: {
    backgroundColor: '#ffebee',
    color: '#d32f2f',
  },
  messageSuccess: {
    backgroundColor: '#e8f5e9',
    color: '#388e3c',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f7',
  },
  loadingText: {
    marginTop: 10,
    color: '#6a1b9a',
  },
});
