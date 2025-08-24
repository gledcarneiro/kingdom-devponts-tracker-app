import React, { useState, useEffect, createContext, useContext } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'; // Import useSafeAreaInsets
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, onAuthStateChanged, signOut } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, doc, setDoc, collection, getDocs, query, limit } from 'firebase/firestore'; // Import 'query' and 'limit'
// import NetInfo from "@react-native-community/netinfo"; // COMMENTED OUT: Import NetInfo

// Componentes da sua aplicação
import Dashboard from './Dashboard';
import LoginScreen from './LoginScreen'; // Importa a tela de login separada
import { firebaseConfig, APP_ID } from './firebaseConfig'; // Importa a configuração centralizada
import { FirebaseContext } from './FirebaseContext'; // Importa o contexto

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
      setIsFirebaseReady(true); // <-- Este deve ser o ponto final da inicialização bem-sucedida

    } catch (e) {
      console.error("FirebaseProvider: Erro fatal ao inicializar o Firebase:", e);
      setIsFirebaseReady(false);
    }
  }, []); // Array de dependências vazio para rodar apenas uma vez

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
  // const [isConnected, setIsConnected] = useState(true); // COMMENTED OUT: Novo estado para a conexão de rede
  // const [initialNetworkStateFetched, setInitialNetworkStateFetched] = useState(false); // COMMENTED OUT: New state to track initial network state fetch
  // Use o contexto para obter as instâncias e o estado de prontidão
  const { auth, db, isFirebaseReady } = useContext(FirebaseContext);
  const insets = useSafeAreaInsets(); // Call the hook here

  // REMOVIDA a função initializeRanking, pois não usaremos mais o ranking global de teste.

  // COMMENTED OUT: Effect to handle NetInfo listener and initial fetch
  // useEffect(() => {
  //   // Listener para verificar o status da conexão de rede
  //   const unsubscribeNetInfo = NetInfo.addEventListener(state => {
  //     setIsConnected(state.isConnected);
  //   });

  //   // Get initial network state and set state
  //   NetInfo.fetch().then(state => {
  //     setIsConnected(state.isConnected);
  //     setInitialNetworkStateFetched(true); // Mark initial fetch as complete
  //   }).catch(error => {
  //       console.error("MainApp: Error fetching initial network state:", error);
  //       setIsConnected(false); // Assume disconnected on error
  //       setInitialNetworkStateFetched(true); // Still mark as fetched even on error
  //   });


  //   // Clean up the listener
  //   return () => {
  //     unsubscribeNetInfo();
  //   };

  // }, []); // Dependência vazia para rodar apenas na montagem


  useEffect(() => {
    // Só prossegue se o Firebase estiver pronto e as instâncias de auth/db existirem
    if (!isFirebaseReady || !auth || !db) {
      // Ensure loading remains true while waiting
      if (!loading) setLoading(true); // Keep loading if prerequisites not met
      return; // Do not set up auth listener if Firebase is not ready
    }

    // A autenticação deve ser verificada APENAS quando auth estiver pronto
    const unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setUser(authUser);
      } else {
        setUser(null);
      }
      // Garante que o estado de carregamento é atualizado após a verificação
      setLoading(false); // <-- Este deve ser o ponto final do carregamento principal
    });

    // Retorna a função de unsubscribe para limpar o listener de autenticação
    return () => {
      unsubscribeAuth();
    };

  }, [isFirebaseReady, auth, db]); // Depende das instâncias e do estado de prontidão


  // COMMENTED OUT: Effect para lidar com a falta de conexão - este apenas loga ou faz algo *depois* que o estado isConnected muda
  // useEffect(() => {
  //     if (!isConnected) {
  //         console.warn("MainApp: Sem conexão com a internet.");
  //     } else {
  //         // console.log("MainApp: Conectado à internet."); // Removed log
  //         // Se houver um estado de erro visível devido à falta de conexão, você pode limpá-lo aqui
  //     }
  // }, [isConnected]);


  const handleSignOut = async () => {
    try {
      if (auth) { // Check if auth is initialized
         await signOut(auth);
      } else {
         console.warn("MainApp: Tentativa de logout, mas auth não está inicializado.");
      }
    } catch (error) {
      console.error("MainApp: Erro ao fazer logout:", error);
    }
  };


  // >>> COMMENTED OUT: Condição de renderização para falta de conexão
  // Esta condição deve ter prioridade sobre as telas de carregamento se isConnected for false
  // Adicionado check para initialNetworkStateFetched para garantir que já verificamos a conexão inicial
  // if (initialNetworkStateFetched && !isConnected) {
  //     return (
  //          <View style={[
  //              styles.errorContainer, // Usar estilo de erro
  //              { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }
  //           ]}>
  //              {/* Garante que o texto de erro está dentro de <Text> */}
  //              <Text style={styles.errorText}>Sem conexão com a internet. Verifique sua conexão e tente novamente.</Text>
  //          </View>
  //     );
  // }
  // <<< Fim da condição de renderização para falta de conexão


  // Render loading screen if still loading, Firebase not ready, OR initial network state not yet fetched
  // COMMENTED OUT: Removed initialNetworkStateFetched from this condition
  if (loading || !isFirebaseReady) {
    // Garante que o estado de carregamento inicial cobre o tempo que o Firebase leva para inicializar E a rede inicial
     if (!isFirebaseReady) {
         return (
              <View style={[
                  styles.loadingContainer,
                  { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }
               ]}>
                  <ActivityIndicator size="large" color="#6a1b9a" />
                  {/* Garante que o texto está dentro de <Text> */}
                  <Text style={styles.loadingText}>Inicializando Firebase...</Text> {/* Updated text */}
              </View>
         );
     }

     // If isFirebaseReady is true but loading is still true (waiting for auth state OR initial network state)
     // COMMENTED OUT: Simplified condition
     if (loading) {
         // Refine the loading text based on what we are waiting for
         // COMMENTED OUT: Removed dynamic message related to network
         const loadingMessage = "Verificando autenticação..."; // If network fetched, must be waiting for auth

         return (
            <View style={[
                styles.loadingContainer,
                { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }
             ]}>
               <ActivityIndicator size="large" color="#6a1b9a" />
               <Text style={styles.loadingText}>{loadingMessage}</Text> {/* Dynamic text */}
            </View>
         );
     }
  }


  // If we reach here, loading is false, isFirebaseReady is true, initialNetworkStateFetched is true, AND isConnected is true
  // COMMENTED OUT: Removed check for initialNetworkStateFetched and isConnected from this implicit condition

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

// Componente raiz do aplicativo
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
  },
   rankingLoadingContainer: { // New style for ranking loading
     justifyContent: 'center',
     alignItems: 'center',
     paddingVertical: 20,
   },
   rankingLoadingText: { // New style for ranking loading text
     marginTop: 10,
     fontSize: 14,
     color: '#6a1b9a',
   },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
  },
  // Estilos para o Cabeçalho
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  header: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  signOutButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#e57373',
    borderRadius: 8,
  },
  signOutButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  // Estilos para o Carrossel
  carouselTitle: { // Moved from TerrainsCarousel - maybe keep here or in a shared style file
    fontSize: 18,
    fontWeight: '600',
    color: '#444',
    marginBottom: 8,
    marginTop: 15,
    textAlign: 'center',
  },
  rankingTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#444',
    marginBottom: 10,
    textAlign: 'center',
    marginTop: 20,
  },
  listContainer: {
    flex: 1,
  },
  rankingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
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
    marginHorizontal: 15, // Adiciona margem para alinhar com o resto do conteúdo
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  topRankingItem: {
    // Borda sutil para destacar os 3 primeiros
    borderColor: '#e0e0e0',
    borderWidth: 1,
  },
  rankingPosition: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#6a1b9a',
    marginRight: 15,
  },
  gold: {
    backgroundColor: '#FFD700', // Ouro
  },
  silver: {
    backgroundColor: '#C0C0C0', // Prata
  },
  bronze: {
    backgroundColor: '#CD7F32', // Bronze
    },
  rankingPositionText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  rankingInfo: {
    flex: 1,
  },
  rankingName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  topRankingName: {
    fontWeight: '700', // Negrito para os nomes do top 3
  },
  rankingTotal: {
    fontSize: 14,
    color: '#888',
  },
});

export default App;