import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView, TouchableOpacity, ScrollView, Platform, StatusBar } from 'react-native';
import {
  getFirestore,
  collection,
  query,
  onSnapshot,
  doc,
  setDoc,
  limit
} from 'firebase/firestore';

// Importa o contexto do Firebase
import { FirebaseContext } from './FirebaseContext';

// Dados mockados para o carrossel de terrenos
const terrenosData = [
  { id: '1', name: 'Planície Verdejante', description: 'Um terreno fértil para começar a sua jornada.' },
  { id: '2', name: 'Montanhas do Dragão', description: 'Uma área rochosa com recursos raros e perigosos.' },
  { id: '3', name: 'Floresta Sombria', description: 'Um local misterioso, perfeito para exploradores audaciosos.' },
  { id: '4', name: 'Ilha Flutuante', description: 'Um terreno mítico, acessível apenas para os mais poderosos.' },
];

// Componente para renderizar cada item do carrossel
const renderTerrenoItem = ({ item }) => (
  <View style={styles.terrenoCard}>
    <Text style={styles.terrenoName}>{item.name}</Text>
    <Text style={styles.terrenoDescription}>{item.description}</Text>
  </View>
);

// O componente Dashboard é responsável por mostrar o carrossel de terrenos e o ranking dos usuários.
const Dashboard = ({ user, handleSignOut }) => {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const { db } = useContext(FirebaseContext);

  // Listener em tempo real para o ranking global
  useEffect(() => {
    if (!user || !db) {
      setLoading(false);
      return;
    }

    // Listener para o ranking global
    const q = query(collection(db, 'users'));
    const unsubscribeRanking = onSnapshot(q, (querySnapshot) => {
      const usersRanking = [];
      querySnapshot.forEach((document) => {
        usersRanking.push({
          id: document.id,
          ...document.data(),
        });
      });
      // Ordena os usuários em memória, do maior para o menor
      usersRanking.sort((a, b) => b.devPoints - a.devPoints);
      setRanking(usersRanking);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao ouvir o ranking:", error);
      setLoading(false);
    });

    return () => {
      unsubscribeRanking();
    };
  }, [user, db]);

  const renderRankingItem = ({ item, index }) => (
    <View style={styles.rankingItem}>
      <Text style={styles.rankingPosition}>{index + 1}º</Text>
      <Text style={styles.rankingEmail}>{item.email}</Text>
      <Text style={styles.rankingPoints}>{item.devPoints}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6a1b9a" />
        <Text style={styles.loadingText}>Carregando dados...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.dashboardContainer}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Bem-vindo, {user?.email}!</Text>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutButtonText}>Sair</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.carouselTitle}>Terrenos</Text>
        <FlatList
          horizontal={true}
          data={terrenosData}
          renderItem={renderTerrenoItem}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContainer}
        />

        <Text style={styles.rankingTitle}>Ranking Global</Text>
        <View style={styles.rankingCard}>
          {ranking.length > 0 ? (
            <FlatList
              data={ranking}
              keyExtractor={(item) => item.id}
              renderItem={renderRankingItem}
              scrollEnabled={false}
              contentContainerStyle={styles.listContent}
            />
          ) : (
            <Text style={styles.rankingPlaceholderText}>
              Nenhum usuário no ranking ainda.
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  dashboardContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    // Adiciona padding superior para evitar a barra de status em Android e iOS
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scrollContent: {
    paddingBottom: 20,
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
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#6a1b9a',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    marginBottom: 20,
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
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
  carouselTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#444',
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  carouselContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  terrenoCard: {
    backgroundColor: '#444',
    borderRadius: 16,
    padding: 20,
    marginRight: 15,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  terrenoName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  terrenoDescription: {
    fontSize: 14,
    color: '#eee',
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
  listContent: {
    paddingBottom: 10,
  },
  rankingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  rankingPosition: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6a1b9a',
    minWidth: 30, // Garante que a posição não se movam
  },
  rankingEmail: {
    flex: 1,
    fontSize: 16,
    marginLeft: 10,
    color: '#333',
  },
  rankingPoints: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4caf50',
  },
});

export default Dashboard;
