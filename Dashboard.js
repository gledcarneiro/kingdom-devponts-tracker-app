import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getFirestore,
  collection,
  query,
  onSnapshot,
  getDocs,
  limit,
  doc
} from 'firebase/firestore';

// Importa o novo componente do carrossel
import TerrainsCarousel from './TerrainsCarousel';
import { APP_ID } from './firebaseConfig'; // Importa o APP_ID centralizado

// O componente para renderizar um item do ranking
const RankingItem = ({ item }) => {
  const isTopThree = item.position <= 3;

  // Define o estilo do círculo de posição com base na classificação
  const getPositionStyle = () => {
    switch (item.position) {
      case 1:
        return [styles.rankingPosition, styles.gold];
      case 2:
        return [styles.rankingPosition, styles.silver];
      case 3:
        return [styles.rankingPosition, styles.bronze];
      default:
        return styles.rankingPosition;
    }
  };

  // Adiciona um destaque sutil para os itens do top 3
  const itemStyle = isTopThree ? [styles.rankingItem, styles.topRankingItem] : styles.rankingItem;
  // Deixa o nome dos jogadores do top 3 em negrito
  const nameStyle = isTopThree ? [styles.rankingName, styles.topRankingName] : styles.rankingName;

  return (
    <View style={itemStyle}>
      <View style={getPositionStyle()}>
        <Text style={styles.rankingPositionText}>#{item.position}</Text>
      </View>
      <View style={styles.rankingInfo}>
        <Text style={nameStyle}>{item.name}</Text>
        <Text style={styles.rankingTotal}>{item.total.toFixed(2)}</Text>
      </View>
    </View>
  );
};

// O componente Dashboard é responsável por mostrar o ranking dos usuários.
const Dashboard = ({ user, handleSignOut, db }) => {
  const insets = useSafeAreaInsets();
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Garante que tanto o Firestore quanto o usuário estejam prontos
    if (!db || !user) return;

    const rankingCollectionRef = collection(db, `/artifacts/${APP_ID}/public/data/ranking`);

    const unsubscribe = onSnapshot(rankingCollectionRef, (snapshot) => {
      const data = [];
      snapshot.forEach(doc => {
        data.push({
          id: doc.id,
          ...doc.data()
        });
      });

      const sortedData = data.sort((a, b) => b.total - a.total);

      const rankingWithPosition = sortedData.map((item, index) => ({
        ...item,
        position: index + 1
      }));

      setRanking(rankingWithPosition);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao buscar o ranking:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  // Adiciona `user` como dependência para reativar o efeito quando o usuário fizer login
  }, [db, user]);

  if (loading) {
    return (
      <View style={[
        styles.loadingContainer,
        { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }
      ]}>
        <ActivityIndicator size="large" color="#6a1b9a" />
        <Text style={styles.loadingText}>Carregando Ranking...</Text>
      </View>
    );
  }

  return (
    <View style={[
      styles.container,
      // Aplicamos os insets como padding para garantir que o conteúdo não fique sob as barras do sistema
      { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }
    ]}>
      {/* Container do cabeçalho */}
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Bem-vindo, {user?.email}!</Text>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>Sair</Text>
        </TouchableOpacity>
      </View>

      {/* Carrossel dos terrenos */}
      <TerrainsCarousel />

      {/* Lista de Ranking Global */}
      <Text style={styles.rankingTitle}>Ranking Global</Text>
      {ranking.length > 0 ? (
        <FlatList
          data={ranking}
          renderItem={({ item }) => <RankingItem item={item} />}
          keyExtractor={item => item.id}
          style={styles.listContainer}
        />
      ) : (
        <View style={styles.rankingCard}>
          <Text style={styles.rankingPlaceholderText}>Ainda não há dados de ranking.</Text>
        </View>
      )}
    </View>
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

export default Dashboard;
