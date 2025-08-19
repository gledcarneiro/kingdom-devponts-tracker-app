import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Variáveis globais para Firebase.
const firebaseConfig = {
  apiKey: "AIzaSyAted6ls2JRLmlbAWpWnbNqr8lqvRiqNtY",
  authDomain: "kingdom-devponts-tracker.firebaseapp.com",
  projectId: "kingdom-devponts-tracker",
  storageBucket: "kingdom-devponts-tracker.firebasestorage.app",
  messagingSenderId: "285976466192",
  appId: "1:285976466192:web:8c754a66ebb61dca044b95"
};

// Função para inicializar o Firebase
const initializeFirebase = () => {
  try {
    const app = initializeApp(firebaseConfig);
    return {
      auth: getAuth(app),
      db: getFirestore(app)
    };
  } catch (e) {
    console.error("Erro ao inicializar o Firebase:", e);
    return null;
  }
};

// Componente para o formulário de login/registro
const AuthForm = ({ email, setEmail, password, setPassword, isLoginView, handleAuth, loading, toggleView, message }) => (
  // O KeyboardAvoidingView ajusta a tela para que o teclado não cubra os inputs.
  <KeyboardAvoidingView
    style={styles.container}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  >
    {/* O ScrollView permite que a tela seja rolada, evitando que o conteúdo fique 'preso' */}
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

// Componente para o perfil do usuário
const UserProfile = ({ user, handleSignOut }) => (
  <View style={styles.container}>
    <View style={styles.profileCard}>
      <Text style={styles.header}>Bem-vindo!</Text>
      <Image
        source={{ uri: 'https://placehold.co/80x80/6a1b9a/ffffff?text=Perfil' }}
        style={styles.profileImage}
      />
      <Text style={styles.profileText}>E-mail: {user?.email}</Text>
      <Text style={styles.profileText}>ID do Usuário: {user?.uid}</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={handleSignOut}
      >
        <Text style={styles.buttonText}>Sair</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const App = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [firebase, setFirebase] = useState(null);
  const [isLoginView, setIsLoginView] = useState(true);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const firebaseInstances = initializeFirebase();
    if (firebaseInstances) {
      setFirebase(firebaseInstances);
      const { auth } = firebaseInstances;

      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
          console.log("Usuário autenticado:", currentUser.uid);
        } else {
          console.log("Usuário deslogado.");
        }
      });

      return () => unsubscribe();
    }
  }, []);

  const handleAuth = async () => {
    if (!firebase) {
      setMessage({ type: 'error', text: 'Firebase não inicializado.' });
      return;
    }

    if (!email || !password) {
      setMessage({ type: 'error', text: 'E-mail e senha são obrigatórios.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      if (isLoginView) {
        await signInWithEmailAndPassword(firebase.auth, email, password);
        setMessage({ type: 'success', text: 'Login realizado com sucesso!' });
      } else {
        await createUserWithEmailAndPassword(firebase.auth, email, password);
        // Ao registrar com sucesso, volte para a tela de login
        setMessage({ type: 'success', text: 'Conta criada com sucesso!' });
        setIsLoginView(true);
      }
    } catch (error) {
      let errorMessage = "Ocorreu um erro. Por favor, tente novamente.";
      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = 'O endereço de e-mail é inválido.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Senha incorreta.';
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
          console.error("Erro de autenticação:", error.code, error.message);
          errorMessage = 'Erro desconhecido. Por favor, tente novamente.';
      }
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    if (firebase) {
      firebase.auth.signOut();
    }
  };

  const toggleView = () => {
    setIsLoginView(!isLoginView);
    setMessage(null);
  };

  if (!firebase) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6a1b9a" />
        <Text style={styles.loadingText}>Inicializando Firebase...</Text>
      </View>
    );
  }

  return user ? (
    <UserProfile user={user} handleSignOut={handleSignOut} />
  ) : (
    <AuthForm
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
  },
  profileCard: {
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
  profileText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 10,
    textAlign: 'center',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 20,
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
});

export default App;
