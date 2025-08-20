import React, { useState, useEffect, createContext, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, SafeAreaView, FlatList } from 'react-native';
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection, query, orderBy, getDocs } from 'firebase/firestore';

// Componentes da sua aplicação
import Dashboard from './Dashboard';

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
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const rankingCollectionRef = collection(db, `/artifacts/${appId}/public/data/ranking`);

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
  return (
    <View style={styles.container}>
      <Text>Login Screen - Placeholder</Text>
    </View>
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
});

export default App;
