// VERSÃO TEMPORÁRIA PARA DEBUG - App.js
import React, { useState, useEffect, createContext, useContext } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, onAuthStateChanged, signOut } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';

// Componentes da aplicação
import Dashboard from './Dashboard';
import LoginScreen from './LoginScreen';
import { firebaseConfig } from './firebaseConfig';
import { FirebaseContext } from './FirebaseContext';

// FirebaseProvider - SIMPLIFICADO PARA DEBUG
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
      console.error("FirebaseProvider: Erro ao inicializar Firebase:", e);
      setIsFirebaseReady(false);
    }
  }, []);

  return (
    <FirebaseContext.Provider value={{ auth, db, isFirebaseReady }}>
      {children}
    </FirebaseContext.Provider>
  );
};

// MainApp - SIMPLIFICADO PARA DEBUG
const MainApp = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { auth, db, isFirebaseReady } = useContext(FirebaseContext);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!isFirebaseReady || !auth || !db) {
      if (!loading) setLoading(true);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setUser(authUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, [isFirebaseReady, auth, db]);

  const handleSignOut = async () => {
    try {
      if (auth) {
         await signOut(auth);
      } else {
         console.warn("MainApp: Auth não inicializado para logout.");
      }
    } catch (error) {
      console.error("MainApp: Erro ao fazer logout:", error);
    }
  };

  // DEBUG: Rendering com verificações explícitas
  if (!isFirebaseReady) {
    return (
      <View style={[
        styles.loadingContainer,
        { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }
      ]}>
        <ActivityIndicator size="large" color="#6a1b9a" />
        <Text style={styles.loadingText}>{"Inicializando Firebase..."}</Text>
      </View>
    );
  }

  // TESTE: Adicionando lógica de loading complexa do original
  if (loading || !isFirebaseReady) {
    if (!isFirebaseReady) {
      return (
        <View style={[
          styles.loadingContainer,
          { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }
        ]}>
          <ActivityIndicator size="large" color="#6a1b9a" />
          <Text style={styles.loadingText}>{"Inicializando Firebase..."}</Text>
        </View>
      );
    }

    if (loading) {
      const loadingMessage = "Verificando autenticação..."; // Variável dinâmica como original
      
      return (
        <View style={[
          styles.loadingContainer,
          { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }
        ]}>
          <ActivityIndicator size="large" color="#6a1b9a" />
          <Text style={styles.loadingText}>{loadingMessage}</Text>
        </View>
      );
    }
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

// App - MANTIDO IGUAL
const App = () => (
  <SafeAreaProvider>
    <FirebaseProvider>
      <MainApp />
    </FirebaseProvider>
  </SafeAreaProvider>
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
    fontSize: 16,
    color: '#333',
  },
});

export default App;