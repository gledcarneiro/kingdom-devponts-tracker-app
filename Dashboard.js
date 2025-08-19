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
