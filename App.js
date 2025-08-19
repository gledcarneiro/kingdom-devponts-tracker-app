import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, SafeAreaView } from 'react-native';
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration variables.
const firebaseConfig = {
  apiKey: "AIzaSyAted6ls2JRLmlbAWpWnbNqr8lqvRiqNtY",
  authDomain: "kingdom-devponts-tracker.firebaseapp.com",
  projectId: "kingdom-devponts-tracker",
  storageBucket: "kingdom-devponts-tracker.firebasestorage.app",
  messagingSenderId: "285976466192",
  appId: "1:285976466192:web:8c754a66ebb61dca044b95"
};

// Initialize Firebase ONE TIME
let auth;
try {
  const app = initializeApp(firebaseConfig);
  // Adiciona a persistência de autenticação
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
} catch (e) {
  console.error("Fatal error initializing Firebase:", e);
}


// Component for the login/signup form
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


// Main Dashboard component
const Dashboard = ({ user, handleSignOut }) => {
  const [devPoints, setDevPoints] = useState(0); // State for DevPoints
  const [ranking, setRanking] = useState([]); // State for ranking

  // Example of how a button can increase points
  const handleAddPoints = () => {
    setDevPoints(currentPoints => currentPoints + 1);
  };

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
        {/* Placeholder for the ranking list.
        // This will be dynamically populated with Firestore data in the next step. */}
        <Text style={styles.rankingPlaceholderText}>
          Aguardando dados de ranking...
        </Text>
        <Text style={styles.rankingPlaceholderText}>
          (A funcionalidade de ranking será adicionada na próxima etapa)
        </Text>
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

  // Monitor the user's authentication state
  useEffect(() => {
    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
          console.log("User authenticated:", currentUser.uid);
        } else {
          console.log("User logged out.");
        }
      });
      return () => unsubscribe();
    }
  }, []);

  const handleAuth = async () => {
    if (!auth) {
      setMessage({ type: 'error', text: 'Firebase not initialized.' });
      return;
    }

    if (!email || !password) {
      setMessage({ type: 'error', text: 'Email and password are required.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      if (isLoginView) {
        await signInWithEmailAndPassword(auth, email, password);
        setMessage({ type: 'success', text: 'Login successful!' });
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        setMessage({ type: 'success', text: 'Account created successfully!' });
      }
    } catch (error) {
      let errorMessage = "An error occurred. Please try again.";
      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = 'The email address is invalid.';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Incorrect email or password.';
          break;
        case 'auth/user-not-found':
          errorMessage = 'User not found. Please register.';
          break;
        case 'auth/email-already-in-use':
          errorMessage = 'This email is already in use.';
          break;
        case 'auth/weak-password':
          errorMessage = 'The password must be at least 6 characters.';
          break;
        default:
          console.error("Authentication error:", error.code, error.message);
          errorMessage = 'Unknown error. Please try again.';
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
    // ADICIONADO: Limpar o estado de e-mail e senha ao alternar a tela
    setEmail('');
    setPassword('');
    setMessage(null);
  };

  if (!auth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6a1b9a" />
        <Text style={styles.loadingText}>Initializing Firebase...</Text>
      </View>
    );
  }

  // Conditional rendering: if the user is logged in, show the Dashboard. Otherwise, show the authentication screen.
  return user ? (
    <Dashboard user={user} handleSignOut={handleSignOut} />
  ) : (
    // ADICIONADO: A prop 'key' força o componente a ser recriado quando a view muda
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
    marginTop: 50, // Added top margin
    marginBottom: 50, // Added bottom margin
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
    paddingTop: 50, // Added top padding for the entire dashboard
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
    alignItems: 'center',
  },
  rankingPlaceholderText: {
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default App;
