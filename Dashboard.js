import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, ScrollView, Alert } from 'react-native'; // Import Alert for simple confirmation if not using modal
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getFirestore,
  collection,
  query,
  onSnapshot, // Keep onSnapshot for real-time updates on user terrains
  getDocs, // Maybe not needed here anymore if using onSnapshot for terrains
  limit,
  doc, // Importando 'doc'
  setDoc, // Importando 'setDoc'
  deleteDoc // Importando 'deleteDoc' para a funcionalidade de exclusão
} from 'firebase/firestore';
import { signOut } from 'firebase/auth'; // Import signOut from auth

// Importa o novo componente do carrossel
import TerrainsCarousel from './TerrainsCarousel';
import { updateLandRankingInFirebase } from './services/firebaseService'; // Keep for long press update
import { fetchLandContribution } from './services/apiService'; // Keep for long press update
import { APP_ID } from './firebaseConfig'; // Keep if still used
import AddTerrainModal from './AddTerrainModal'; // Importa o modal (será usado para adicionar e confirmar exclusão)

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
        <Text style={styles.rankingTotal}>{item.points.toLocaleString()}</Text>
      </View>
    </View>
  );
};

// O componente Dashboard é responsável por mostrar o ranking dos usuários e o carrossel de terrenos personalizados.
const Dashboard = ({ user, handleSignOut, db }) => { // db is passed as prop from MainApp
  const insets = useSafeAreaInsets();
  const [ranking, setRanking] = useState([]); // State for the *ranking* of the selected land
  const [userTerrains, setUserTerrains] = useState([]); // New state for the *user's list of terrains*
  const [loading, setLoading] = useState(true); // Initial loading for user terrains
  const [rankingLoading, setRankingLoading] = useState(false); // State to indicate if ranking is loading
  const [selectedLandId, setSelectedLandId] = useState(null); // Initially null, will be set by carousel
  const [isAddModalVisible, setIsAddModalVisible] = useState(false); // State to control Add modal visibility
  const [isDeleteConfirmationVisible, setIsDeleteConfirmationVisible] = useState(false); // State to control Delete modal visibility
  const [terrainToDeleteId, setTerrainToDeleteId] = useState(null); // State to store ID of terrain to delete


  // Effect to load user's terrains from Firebase
  useEffect(() => {
    if (!db || !user) {
      setUserTerrains([]); // Clear terrains if user or db is not ready
      setLoading(false); // Stop initial loading if prerequisites are not met
      console.log("Firebase ou usuário não pronto para carregar terrenos do usuário.");
      return;
    }

    console.log(`Carregando terrenos para o usuário: ${user.uid}`);
    const userTerrainsCollectionRef = collection(db, `users/${user.uid}/terrenos`);

    const unsubscribeTerrains = onSnapshot(userTerrainsCollectionRef, (snapshot) => {
      const terrainsData = [];
      snapshot.forEach(doc => {
        terrainsData.push({
          id: doc.id, // Use doc.id as landId
          ...doc.data()
        });
      });

      // Adiciona o objeto especial para o card "Adicionar Terreno"
      const addTerrainCard = { id: 'add-new-terrain', name: 'Adicionar Terreno', isAddNewCard: true };

      // Adiciona o objeto especial para o card "Apagar Terreno Selecionado"
      // Adicionamos ele apenas se houver pelo menos um terreno real na lista
      const deleteCard = terrainsData.length > 0
        ? { id: 'delete-selected-terrain', name: 'Apagar Selecionado', isDeleteCard: true }
        : null;

      // Combina a lista de terrenos reais com os cards especiais
      // Coloca o card de exclusão NO INÍCIO, se ele existir
      let updatedTerrainsData = [...terrainsData, addTerrainCard]; // Real terrains + Add card
      if (deleteCard) {
          updatedTerrainsData = [deleteCard, ...updatedTerrainsData]; // Add Delete card at the beginning
      }


      // Optional: Sort terrains if needed (e.g., by level or points)
      // For now, let's just set the data as is
      setUserTerrains(updatedTerrainsData); // Use updatedTerrainsData

      console.log(`Terrenos do usuário carregados: ${terrainsData.length} encontrados.`);
      console.log("Card 'Adicionar Terreno' adicionado à lista.");
      if (deleteCard) {
        console.log("Card 'Apagar Selecionado' adicionado à lista.");
      }


      // Set the first *real* terrain as selected by default if the list is not empty
      // Only set if no land is currently selected OR if the previously selected land is no longer in the list
      const realTerrains = updatedTerrainsData.filter(terrain => !terrain.isAddNewCard && !terrain.isDeleteCard); // Filter out special cards
      const firstRealTerrain = realTerrains.length > 0 ? realTerrains[0] : null;
      const isSelectedLandStillPresent = realTerrains.some(terrain => terrain.id === selectedLandId);


      if (realTerrains.length > 0) {
         // If there are real terrains, select the first one if nothing is selected
         // or if the previously selected land is no longer in the list.
         if (!selectedLandId || !isSelectedLandStillPresent) {
            setSelectedLandId(firstRealTerrain.id);
            console.log(`Definindo Land ID selecionado para o primeiro terreno real: ${firstRealTerrain.id}`);
         }
         // If selectedLandId is set and is still present, keep it.
      } else {
         // If there are no real terrains, ensure selectedLandId is null
         setSelectedLandId(null);
         setRanking([]); // Clear ranking if no terrains
         console.log("Nenhum terreno real do usuário encontrado. Limpando Land ID selecionado e ranking.");
      }
      // Note: If selectedLandId was set to a real terrain that was just deleted,
      // the isSelectedLandStillPresent check will be false, and the first real terrain will be selected (if exists) or selectedLandId will become null. This seems like reasonable behavior.


      setLoading(false);
    }, (error) => {
      console.error("Erro ao buscar os terrenos do usuário:", error);
      setUserTerrains([]);
      setLoading(false);
    });

    // Clean up the listener
    return () => {
      console.log("Limpando o listener de terrenos do usuário.");
      unsubscribeTerrains();
    };

  }, [db, user, selectedLandId]); // selectedLandId added as dependency to re-evaluate selection logic


  // Effect to fetch ranking for the selected land (remains the same)
  useEffect(() => {
    // Only fetch ranking if db, user, and a selectedLandId are available AND it's not a special card ID
    if (!db || !user || !selectedLandId || selectedLandId === 'add-new-terrain' || selectedLandId === 'delete-selected-terrain') {
      console.log("Pré-requisitos para carregar ranking não atendidos ou Land ID é um card especial. Limpando ranking.");
      setRanking([]); // Clear ranking if no land is selected or db/user not ready or special card selected
      return;
    }

    console.log(`Buscando ranking para Land ID: ${selectedLandId}`);
    setRankingLoading(true); // Start ranking loading indicator

    // Note: The ranking data is stored per land, not per user.
    // The user's selection in the carousel determines which land's ranking to fetch.
    const rankingCollectionRef = collection(db, `lands/${selectedLandId}/ranking`);

    const unsubscribeRanking = onSnapshot(rankingCollectionRef, (snapshot) => {
      const data = [];
      snapshot.forEach(doc => {
        data.push({
          id: doc.id, // Use doc.id (kingdomId) as key
          ...doc.data()
        });
      });

      // Ordena pelo campo 'points' (agora armazenado como points no Firebase)
      const sortedData = data.sort((a, b) => b.points - a.points);

      // Adiciona posição
      const rankingWithPosition = sortedData.map((item, index) => ({
        ...item,
        position: index + 1
      }));

      setRanking(rankingWithPosition);
      setRankingLoading(false); // Ranking is loaded
      console.log(`Ranking para Land ID ${selectedLandId} carregado com ${data.length} itens.`);
    }, (error) => {
      console.error(`Erro ao buscar o ranking para Land ID ${selectedLandId}:`, error);
      setRanking([]);
      setRankingLoading(false); // Stop ranking loading indicator on error
    });

    // Retorna a função de unsubscribe para limpar o listener
    return () => {
      console.log(`Limpando o listener de ranking para Land ID ${selectedLandId}.`);
      unsubscribeRanking();
    };

  }, [db, user, selectedLandId]); // Depend on db, user, AND selectedLandId


  // Handle updating ranking via long press on carousel item (remains the same)
  const handleUpdateRanking = async (landId) => {
     // Prevent updating if it's a special card
     if (landId === 'add-new-terrain' || landId === 'delete-selected-terrain') {
       console.log(`Ignorando atualização de ranking para o card especial: ${landId}.`);
       return;
     }
     // ... (rest of the logic remains the same)
     if (!db) {
       alert('Firebase Database não está pronto.');
       return;
     }
     setRankingLoading(true); // Show loading while updating
    try {
      // We need the selectedLandId for the API call, which is passed from the carousel
      const contributions = await fetchLandContribution(landId);
      if (contributions && contributions.length > 0) {
         await updateLandRankingInFirebase(landId, contributions);
         Alert.alert('Sucesso!', 'Ranking atualizado com sucesso!'); // Usando Alert nativo
         console.log(`Ranking para Land ID ${landId} atualizado via API/Firebase.`);
      } else {
         Alert.alert('Erro', 'Não foi possível obter dados da API ou nenhum dado retornado para atualizar.'); // Usando Alert nativo
          console.log(`Nenhum dado da API retornado para Land ID ${landId} ou erro na busca.`);
      }
    } catch (error) {
      Alert.alert('Erro', 'Erro ao atualizar ranking: ' + error.message); // Usando Alert nativo
      console.error("Erro ao atualizar ranking:", error);
    } finally {
        setRankingLoading(false); // Hide loading after update attempt
    }
  };

  // Função para adicionar Terreno ao Firebase (agora será chamada pelo modal) (remains the same)
  const addTerrainToFirebase = async (terrainData) => {
    if (!db || !user) {
      console.error("Database ou usuário não pronto para adicionar terreno.");
      Alert.alert("Erro", "Serviço indisponível. Tente novamente mais tarde."); // Usando Alert nativo
      return;
    }

    const userId = user.uid;
    const terrainId = terrainData.id; // Usamos o ID do terreno como ID do documento

    if (!terrainId) {
      Alert.alert("Erro", "ID do terreno é obrigatório."); // Usando Alert nativo
      console.error("Tentativa de adicionar terreno sem ID.");
      return;
    }

    try {
      const terrainDocRef = doc(db, `users/${userId}/terrenos`, terrainId);
      await setDoc(terrainDocRef, terrainData); // Usa setDoc com o ID fornecido

      console.log(`Terreno ${terrainId} adicionado ao Firebase para o usuário ${userId}.`);
      // Feedback visual de sucesso - pode ser um toast ou apenas o update instantâneo na tela
      // Alert.alert(`Terreno ${terrainData.name || terrainId} adicionado com sucesso!`); // Removido alert para feedback instantâneo

    } catch (error) {
      console.error("Erro ao adicionar terreno ao Firebase:", error);
      Alert.alert("Erro", "Erro ao adicionar terreno. Verifique o ID e tente novamente."); // Usando Alert nativo
    }
  };

  // Função para remover Terreno do Firebase (chamada após confirmação)
  const removeTerrainFromFirebase = async (landId) => {
      if (!db || !user) {
          console.error("Database ou usuário não pronto para remover terreno.");
          Alert.alert("Erro", "Serviço indisponível. Tente novamente mais tarde."); // Usando Alert nativo
          return;
      }
      if (!landId) {
          console.error("Tentativa de remover terreno sem ID.");
          Alert.alert("Erro", "ID do terreno para remover é obrigatório."); // Usando Alert nativo
          return;
      }

      const userId = user.uid;
      const terrainDocRef = doc(db, `users/${userId}/terrenos`, landId);

      try {
          await deleteDoc(terrainDocRef);
          console.log(`Terreno ${landId} removido do Firebase para o usuário ${userId}.`);
          // Feedback visual de sucesso - pode ser um toast ou apenas o update instantâneo na tela
          // Alert.alert(`Terreno ${landId} removido com sucesso!`); // Removido alert para feedback instantâneo

          // Após remover, limpamos o ID do terreno a ser deletado e fechamos o modal
          setTerrainToDeleteId(null);
          setIsDeleteConfirmationVisible(false);

      } catch (error) {
          console.error("Erro ao remover terreno do Firebase:", error);
          Alert.alert("Erro", "Erro ao remover terreno. Tente novamente."); // Usando Alert nativo
          // Fechamos o modal mesmo em caso de erro
          setTerrainToDeleteId(null);
          setIsDeleteConfirmationVisible(false);
      }
  };


  // Handle the selection of the "Add New Terrain" card or a real terrain
  const handleSelectLand = (landId) => {
      if (landId === 'add-new-terrain') {
          console.log("Card 'Adicionar Terreno' selecionado. Abrindo modal de adição.");
          setIsAddModalVisible(true); // Abre o modal de adição
          // Não seleciona o card de adicionar novo como selectedLandId
      } else if (landId === 'delete-selected-terrain') {
          console.log("Card 'Apagar Selecionado' selecionado.");
          // Verifica se há um terreno real selecionado para apagar
          if (selectedLandId && selectedLandId !== 'add-new-terrain') {
              // Encontra os dados do terreno selecionado para mostrar no modal de confirmação
              const terrainToConfirm = userTerrains.find(t => t.id === selectedLandId && !t.isAddNewCard && !t.isDeleteCard);
              if (terrainToConfirm) {
                 setTerrainToDeleteId(selectedLandId); // Armazena o ID para exclusão
                 setIsDeleteConfirmationVisible(true); // Abre o modal de confirmação
                 console.log(`Exibindo modal de confirmação para remover terreno com ID: ${selectedLandId}`);
              } else {
                 console.log("Nenhum terreno real selecionado válido para apagar.");
                 Alert.alert("Atenção", "Selecione um terreno válido no carrossel para poder apagá-lo.");
              }
          } else {
              console.log("Nenhum terreno real selecionado para apagar.");
              Alert.alert("Atenção", "Selecione um terreno no carrossel para poder apagá-lo.");
          }
          // Não seleciona o card de apagar como selectedLandId
      }
      else {
          setSelectedLandId(landId); // Seleciona um terreno real
          console.log(`Terreno real com ID ${landId} selecionado.`);
      }
  };

  const handleCloseAddModal = () => {
    setIsAddModalVisible(false); // Fecha o modal de adição
  };

  // Funções para o modal de confirmação de exclusão
  const handleConfirmDelete = () => {
      if (terrainToDeleteId) {
          removeTerrainFromFirebase(terrainToDeleteId); // Chama a função de remoção
      } else {
          console.error("Tentativa de confirmar exclusão sem um terreno selecionado.");
          Alert.alert("Erro", "Não foi possível identificar o terreno para excluir.");
          setIsDeleteConfirmationVisible(false); // Fecha o modal
      }
  };

  const handleCancelDelete = () => {
      setTerrainToDeleteId(null); // Limpa o ID do terreno a ser deletado
      setIsDeleteConfirmationVisible(false); // Fecha o modal de confirmação
  };


  // >>> Prepara os dados para o modal de confirmação
  // Encontra os dados do terreno selecionado para exibir no modal de confirmação
  const terrainDataForConfirmation = userTerrains.find(t => t.id === selectedLandId && !t.isAddNewCard && !t.isDeleteCard);
  const confirmationModalProps = {
      visible: isDeleteConfirmationVisible,
      onClose: handleCancelDelete, // Cancelar fecha o modal
      // Passamos dados específicos para o modal adaptar sua aparência e lógica
      isConfirmation: true,
      confirmText: 'Apagar', // Texto do botão de confirmação
      cancelText: 'Cancelar', // Texto do botão de cancelamento
      confirmationMessage: `Tem certeza que deseja remover o terreno "${terrainDataForConfirmation?.name || terrainToDeleteId}"?`, // Mensagem de confirmação
      onConfirm: handleConfirmDelete, // Função a ser chamada ao confirmar
      // Passamos os dados do terreno para exibição no modal (opcional, depende do layout do modal)
      terrainData: terrainDataForConfirmation,
  };
  // <<< Fim da preparação dos dados para o modal de confirmação


  if (loading) { // This loading state is for the initial loading of user terrains
    return (
      <View style={[
        styles.loadingContainer,
        { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }
      ]}>
        <ActivityIndicator size="large" color="#6a1b9a" />
        <Text style={styles.loadingText}>Carregando terrenos do usuário...</Text>
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
        {/* Call the handleSignOut prop */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>Sair</Text>
        </TouchableOpacity>
      </View>

      {/* Carrossel dos terrenos do usuário */}
      {/* Pass the user's terrains data (including the add new card) and the selectedLandId state */}
      <TerrainsCarousel
        terrains={userTerrains} // Pass the user's terrains including the add new card and delete card
        onSelectLand={handleSelectLand} // Use the new handler
        onUpdateRanking={handleUpdateRanking}
        selectedLandId={selectedLandId} // Pass selectedLandId to highlight
      />

      {/* Lista de Ranking do Terreno Selecionado */}
      <Text style={styles.rankingTitle}>
        {/* Display selected land name or message */}
        {selectedLandId && selectedLandId !== 'add-new-terrain' && selectedLandId !== 'delete-selected-terrain'
           ? `#${userTerrains.find(t => t.id === selectedLandId)?.id} - ${userTerrains.find(t => t.id === selectedLandId)?.name || selectedLandId} - ${ranking.length}`
           : 'Selecione um terreno para ver o ranking'}
      </Text>
      {/* Only show ranking list if a real land is selected */}
      {selectedLandId && selectedLandId !== 'add-new-terrain' && selectedLandId !== 'delete-selected-terrain' ? (
         rankingLoading ? (
            <View style={styles.rankingLoadingContainer}>
               <ActivityIndicator size="small" color="#6a1b9a" />
               <Text style={styles.rankingLoadingText}>Carregando ranking...</Text>
            </View>
         ) : ranking.length > 0 ? (
           <FlatList
             data={ranking}
             renderItem={({ item }) => <RankingItem item={item} />}
             keyExtractor={item => item.id} // Use item.id (kingdomId) as key
             style={styles.listContainer}
           />
         ) : (
           <View style={styles.rankingCard}>
             <Text style={styles.rankingPlaceholderText}>Ainda não há dados de ranking para este terreno.</Text>
           </View>
         )
      ) : (
          // Optional: Show a different message or content when no real land is selected (e.g., add new card is the only one)
          userTerrains.length > 2 ? ( // Check if there are real terrains + add new card + delete card
             <View style={styles.rankingCard}>
                <Text style={styles.rankingPlaceholderText}>Selecione um terreno no carrossel acima para ver o ranking.</Text>
             </View>
          ) : ( // If only special cards or initially empty
             <View style={styles.rankingCard}>
               <Text style={styles.rankingPlaceholderText}>Adicione um terreno para ver o ranking e o ranking de contribuição.</Text>
             </View>
          )
      )}

      {/* Renderiza o modal de adição de terreno */}
      <AddTerrainModal
        visible={isAddModalVisible}
        onClose={handleCloseAddModal}
        onAddTerrain={addTerrainToFirebase} // Passa a função de adicionar para o modal
        // isConfirmation e outras props do modal de confirmação não são passadas aqui
      />

      {/* >>> Renderiza o modal de confirmação de exclusão (reutilizando AddTerrainModal) */}
      {/* Renderizamos o modal de confirmação apenas se ele estiver visível */}
      {isDeleteConfirmationVisible && (
          <AddTerrainModal {...confirmationModalProps} />
      )}
      {/* <<< Fim do modal de confirmação */}
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

export default Dashboard;