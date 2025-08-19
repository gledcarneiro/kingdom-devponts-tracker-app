import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView } from 'react-native';
import {
  getFirestore,
  collection,
  query,
  onSnapshot,
  orderBy,
  limit
} from 'firebase/firestore';

// O componente Dashboard é responsável por mostrar o ranking dos usuários.
const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Referência para o banco de dados e a coleção de usuários
    const db = getFirestore();
    const usersCollectionRef = collection(db, 'users');
    
    // Cria a query para buscar os usuários, ordenando por pontos em ordem decrescente
    // O 'limit(10)' limita a lista aos 10 primeiros
    const usersQuery = query(usersCollectionRef, orderBy('devPoints', 'desc'), limit(10));

    // 'onSnapshot' é um listener que atualiza os dados em tempo real
    // Sempre que houver uma mudança na coleção de 'users', esta função é executada
    const unsubscribe = onSnapshot(usersQuery, (querySnapshot) => {
      try {
        const usersList = [];
        querySnapshot.forEach((doc) => {
          usersList.push({ id: doc.id, ...doc.data() });
        });
        setUsers(usersList);
        setLoading(false);
      } catch (e) {
        console.error("Erro ao carregar os dados do ranking:", e);
        setError("Não foi possível carregar o ranking. Tente novamente mais tarde.");
        setLoading(false);
      }
    }, (e) => {
      // Este callback é para lidar com erros na própria conexão do onSnapshot
      console.error("Erro no listener de snapshot:", e);
      setError("Erro de conexão. Verifique sua rede.");
      setLoading(false);
    });

    // O retorno desta função é executado quando o componente é desmontado
    // É crucial para desativar o listener e evitar vazamento de memória
    return () => unsubscribe();
  }, []); // O array vazio garante que o efeito só rode uma vez

  // Se a tela estiver carregando, mostra um indicador de atividade
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6a1b9a" />
        <Text style={styles.loadingText}>Carregando ranking...</Text>
      </View>
    );
  }

  // Se ocorrer um erro, mostra uma mensagem de erro
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  // Renderiza a lista de usuários
  const renderItem = ({ item, index }) => (
    <View style={styles.itemContainer}>
      <Text style={styles.rankText}>#{index + 1}</Text>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userId}>{item.id}</Text>
      </View>
      <Text style={styles.userPoints}>{item.devPoints} Pontos</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Kingdom DevPoints Ranking</Text>
      <FlatList
        data={users}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
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
  listContent: {
    paddingHorizontal: 20,
  },
  itemContainer: {
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
    elevation: 3,
  },
  rankText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6a1b9a',
    marginRight: 15,
    minWidth: 30,
    textAlign: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  userId: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  userPoints: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6a1b9a',
  },
});

export default Dashboard;
