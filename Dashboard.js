import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native'; // Remove TextInput
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getFirestore,
  collection,
  query,
  onSnapshot, // Keep onSnapshot for real-time updates on user terrains
  getDocs, // Maybe not needed here anymore if using onSnapshot
  limit,
  doc, // Importando 'doc'
  setDoc, // Importando 'setDoc'
  deleteDoc, // Importando 'deleteDoc' para a funcionalidade de exclusão
  writeBatch, // Importar writeBatch para salvar múltiplos documentos eficientemente
  where, // Importar where para consultas filtradas
  orderBy // Importar orderBy para ordenar os resultados
} from 'firebase/firestore';
import { signOut } from 'firebase/auth'; // Import signOut from auth

// Importa o novo componente do carrossel
import TerrainsCarousel from './TerrainsCarousel';
// REMOVIDA a importação de updateLandRankingInFirebase, não usaremos mais essa função aqui
// import { updateLandRankingInFirebase } from './services/firebaseService';
// CORRIGIDO: O caminho da importação agora reflete que 'services' está dentro de 'functions'
// IMPORTANTE: Se estiver rodando o app React Native LOCALMENTe, o caminho CORRETO AQUI É './services/apiService'
// porque a pasta functions NÃO existe na estrutura do APP.
// Se esta Cloud Function estivesse rodando, o caminho CORRETO LÁ seria './services/apiService'.
// VOU MANTER O CAMINHO CORRETO PARA O APP REACT NATIVE:
import { fetchLandContribution } from './functions/services/apiService'; // Keep for fetching API data

import { APP_ID } from './firebaseConfig'; // Keep if still used
import AddTerrainModal from './AddTerrainModal'; // Importa o modal de adição
import DeleteConfirmationModal from './DeleteConfirmationModal'; // Importa o novo modal de exclusão

// IMPORTANDO DateTimePicker
import DateTimePicker from '@react-native-community/datetimepicker';


// REMOVIDO O COMPONENTE RankingItem pois o ranking será removido

// O componente Dashboard é responsável por mostrar o ranking dos usuários e o carrossel de terrenos personalizados.
const Dashboard = ({ user, handleSignOut, db }) => { // db is passed as prop from MainApp
  const insets = useSafeAreaInsets();
  const [ranking, setRanking] = useState([]); // State for the *ranking* of the selected land (this part might change later for historical view)
  const [userTerrains, setUserTerrains] = useState([]); // New state for the *user's list of terrains*
  const [loading, setLoading] = useState(true); // Initial loading for user terrains
  const [rankingLoading, setRankingLoading] = useState(false); // State to indicate if ranking is loading
  const [selectedLandId, setSelectedLandId] = useState(null); // Initially null, will be set by carousel
  const [isAddModalVisible, setIsAddModalVisible] = useState(false); // State to control Add modal visibility
  // Renomeamos isDeleteConfirmationVisible para isDeleteModalVisible para maior clareza
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false); // State to control Delete modal visibility
  const [terrainToDeleteId, setTerrainToDeleteId] = useState(null); // State to store ID of terrain to delete

  // Calcule a data de ontem (d-1) no escopo do componente
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  // CORRIGIDO: A data de ontem é calculada aqui para ser o valor inicial do selectedDate
  // e não para ser usada diretamente na chamada da API ou consulta do Firestore.
  // A consulta e a chamada da API agora usam selectedDate.
  const dateStringYesterday = yesterday.toISOString().split('T')[0]; // 'YYYY-MM-DD' (d-1)
  // Vamos calcular a data de hoje também, pode ser útil
  const dateStringToday = today.toISOString().split('T')[0];

  // NOVO ESTADO: Para armazenar a data selecionada pelo usuário para o ranking (agora um objeto Date)
  // Inicializamos com o dia de ontem como padrão
  const [selectedDate, setSelectedDate] = useState(yesterday);
  // NOVO ESTADO: Para controlar a visibilidade do seletor de data
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Effect to load user's terrains from Firebase AND fetch latest daily contribution
  useEffect(() => {
    if (!db || !user) {
      setUserTerrains([]); // Clear terrains if user or db is not ready
      setLoading(false); // Stop initial loading if prerequisites are not met
      return;
    }

    const userTerrainsCollectionRef = collection(db, `users/${user.uid}/terrenos`);
    const dailyContributionsCollectionRef = collection(db, 'daily_contributions'); // Reference to daily contributions

    const unsubscribeTerrains = onSnapshot(userTerrainsCollectionRef, async (snapshot) => {
      console.log("Dashboard: User terrains onSnapshot triggered."); // Log snapshot trigger
      const terrainsData = [];
      const landIds = []; // Array to store landIds for fetching daily contributions

      snapshot.forEach(doc => {
        const terrain = {
          id: doc.id, // Use doc.id as landId
          ...doc.data()
        };
        terrainsData.push(terrain);
        landIds.push(terrain.id); // Collect landIds
      });

      console.log("Dashboard: User terrains fetched:", terrainsData); // Log fetched terrains

      // Fetch latest daily contribution for each terrain
      const terrainsWithDailyData = await Promise.all(terrainsData.map(async (terrain) => {
        try {
          // Query for the latest daily contribution for this landId
          const q = query(
            dailyContributionsCollectionRef,
            where('landId', '==', terrain.id),
            orderBy('date', 'desc'),
            limit(1) // Get only the latest entry
          );
          const querySnapshot = await getDocs(q);

          let latestDailyContribution = null;
          if (!querySnapshot.empty) {
            latestDailyContribution = querySnapshot.docs[0].data();
            console.log(`Dashboard: Found latest daily data for Land ID ${terrain.id}.`); // Log found daily data
          } else {
            console.log(`Dashboard: No daily data found for Land ID ${terrain.id}.`); // Log no daily data
          }

          // Combine terrain data with latest daily contribution data
          return {
            ...terrain, // Keep existing terrain data (name, level)
            latestDailyContribution: latestDailyContribution // Add the latest daily contribution object
          };
        } catch (error) {
          console.error(`Dashboard: Error fetching latest daily contribution for Land ID ${terrain.id}:`, error); // Log error
          return { ...terrain, latestDailyContribution: null }; // Return terrain with null daily data on error
        }
      }));

      console.log("Dashboard: Terrains with daily data:", terrainsWithDailyData); // Log combined data


      // Add the special cards AFTER fetching and processing real terrains
      const addTerrainCard = { id: 'add-new-terrain', name: 'Adicionar Terreno', isAddNewCard: true };
      const deleteCard = terrainsWithDailyData.length > 0 // Add delete card only if there are real terrains
        ? { id: 'delete-selected-terrain', name: 'Apagar Selecionado', isDeleteCard: true }
        : null;

      let updatedTerrainsData = [...terrainsWithDailyData, addTerrainCard];
       if (deleteCard) {
          updatedTerrainsData = [deleteCard, ...updatedTerrainsData];
      }


      setUserTerrains(updatedTerrainsData);

      // Set the first *real* terrain as selected by default if the list is not empty
      // Only set if no land is currently selected OR if the previously selected land is no longer in the list
      const realTerrains = updatedTerrainsData.filter(terrain => !terrain.isAddNewCard && !terrain.isDeleteCard); // Filter out special cards
      const firstRealTerrain = realTerrains.length > 0 ? realTerrains[0] : null;
      const isSelectedLandStillPresent = realTerrains.some(terrain => terrain.id === selectedLandId);

      if (realTerrains.length > 0) {
         if (!selectedLandId || !isSelectedLandStillPresent) {
            setSelectedLandId(firstRealTerrain.id);
         }
      } else {
         setSelectedLandId(null);
         setRanking([]); // Clear ranking if no terrains
      }

      setLoading(false); // Set loading to false after all data is fetched and processed

    }, (error) => {
      console.error("Erro ao buscar os terrenos do usuário:", error);
      setUserTerrains([]);
      setLoading(false);
    });

    // Clean up the listener
    return () => {
      unsubscribeTerrains();
    };

  }, [db, user, selectedLandId]); // selectedLandId added as dependency to re-evaluate selection logic

  // REFATORAÇÃO DO useEffect DO RANKING COM LOGS DETALHADOS
  useEffect(() => {
      console.log("=== INICIO DEBUG RANKING ===");
      console.log("🔍 selectedDate objeto:", selectedDate);
      console.log("🔍 selectedLandId:", selectedLandId);
      console.log("🔍 db:", !!db);
      console.log("🔍 user:", !!user);
      
      // Formatar data manualmente
      let targetDateString = null;
      if (selectedDate) {
          const year = selectedDate.getFullYear();
          const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
          const day = String(selectedDate.getDate()).padStart(2, '0');
          targetDateString = `${year}-${month}-${day}`;
          
          console.log("📅 Data formatada para query:", targetDateString);
          console.log("📅 selectedDate.toISOString():", selectedDate.toISOString());
          console.log("📅 selectedDate.toDateString():", selectedDate.toDateString());
      } else {
          console.log("❌ selectedDate é null/undefined");
      }

      // Validações de pré-requisitos
      if (!db) {
          console.log("❌ SKIP: db não disponível");
          setRanking([]);
          setRankingLoading(false);
          return;
      }
      
      if (!user) {
          console.log("❌ SKIP: user não disponível");
          setRanking([]);
          setRankingLoading(false);
          return;
      }
      
      if (!selectedLandId) {
          console.log("❌ SKIP: selectedLandId é null");
          setRanking([]);
          setRankingLoading(false);
          return;
      }
      
      if (selectedLandId === 'add-new-terrain' || selectedLandId === 'delete-selected-terrain') {
          console.log("❌ SKIP: selectedLandId é card especial:", selectedLandId);
          setRanking([]);
          setRankingLoading(false);
          return;
      }
      
      if (!targetDateString) {
          console.log("❌ SKIP: targetDateString é null");
          setRanking([]);
          setRankingLoading(false);
          return;
      }

      console.log("✅ INICIANDO QUERY DO RANKING");
      console.log("🎯 Parâmetros da query:");
      console.log("   - Collection: daily_contributions");
      console.log("   - landId:", selectedLandId);
      console.log("   - date:", targetDateString);
      
      setRankingLoading(true);

      // Referência da coleção
      const dailyContributionsCollectionRef = collection(db, 'daily_contributions');

      // QUERY SIMPLIFICADA - sem orderBy composto para evitar problemas de índice
      const q = query(
          dailyContributionsCollectionRef,
          where('landId', '==', selectedLandId),
          where('date', '==', targetDateString)
      );

      console.log("🔄 Executando query...");

      const unsubscribeRanking = onSnapshot(q, (snapshot) => {
          console.log("=== SNAPSHOT RECEBIDO ===");
          console.log("📦 Snapshot size:", snapshot.size);
          console.log("📦 Snapshot empty:", snapshot.empty);
          
          if (snapshot.empty) {
              console.log("⚠️ Nenhum documento encontrado para:");
              console.log("   - landId:", selectedLandId);
              console.log("   - date:", targetDateString);
              setRanking([]);
              setRankingLoading(false);
              return;
          }

          const data = [];
          let docCount = 0;
          
          snapshot.forEach(doc => {
              docCount++;
              const docData = doc.data();
              
              console.log(`📄 Documento ${docCount}:`);
              console.log("   - ID:", doc.id);
              console.log("   - landId doc:", docData.landId);
              console.log("   - date doc:", docData.date);
              console.log("   - contribution_amount:", docData.contribution_amount);
              console.log("   - kingdom_name:", docData.kingdom_name);
              
              // VERIFICAÇÃO CRÍTICA: conferir se a data do documento bate com a data solicitada
              if (docData.date !== targetDateString) {
                  console.log("🚨 ALERTA: Data do documento NÃO confere!");
                  console.log("   - Esperado:", targetDateString);
                  console.log("   - Encontrado:", docData.date);
              } else {
                  console.log("✅ Data do documento confere");
              }
              
              // VERIFICAÇÃO CRÍTICA: conferir se o landId do documento bate
              if (docData.landId !== selectedLandId) {
                  console.log("🚨 ALERTA: landId do documento NÃO confere!");
                  console.log("   - Esperado:", selectedLandId);
                  console.log("   - Encontrado:", docData.landId);
              } else {
                  console.log("✅ landId do documento confere");
              }
              
              data.push({
                  id: doc.id,
                  ...docData
              });
          });

          console.log("=== PROCESSANDO DADOS ===");
          console.log("📊 Total documentos processados:", data.length);

          // Ordenação manual por contribution_amount (decrescente)
          data.sort((a, b) => {
              const amountA = a.contribution_amount || 0;
              const amountB = b.contribution_amount || 0;
              return amountB - amountA;
          });

          console.log("📊 Dados após ordenação:");
          data.forEach((item, index) => {
              console.log(`   ${index + 1}. ${item.kingdom_name}: ${item.contribution_amount}`);
          });

          // Adicionar posições
          const rankingWithPosition = data.map((item, index) => ({
              ...item,
              position: index + 1
          }));

          console.log("=== RANKING FINAL ===");
          console.log("🏆 Total itens no ranking:", rankingWithPosition.length);
          console.log("🏆 Para landId:", selectedLandId);
          console.log("🏆 Para data:", targetDateString);

          setRanking(rankingWithPosition);
          setRankingLoading(false);
          
          console.log("=== FIM DEBUG RANKING ===\n");

      }, (error) => {
          console.error("=== ERRO NA QUERY ===");
          console.error("🔥 Erro:", error);
          console.error("🔥 Code:", error.code);
          console.error("🔥 Message:", error.message);
          console.error("🔥 Para landId:", selectedLandId);
          console.error("🔥 Para data:", targetDateString);
          
          setRanking([]);
          setRankingLoading(false);
      });

      // Cleanup
      return () => {
          console.log("🧹 Limpando listener do ranking para:", selectedLandId, targetDateString);
          unsubscribeRanking();
      };

  }, [db, user, selectedLandId, selectedDate]);

  // LOGS ADICIONAIS NO onDateChange
  // Substitua a função onDateChange por esta versão:

  const onDateChange = (event, date) => {
      console.log("=== onDateChange TRIGGERED ===");
      console.log("📅 Event type:", event.type);
      console.log("📅 Date recebida:", date);
      console.log("📅 selectedDate atual:", selectedDate);
      
      const currentDate = date || selectedDate;
      setShowDatePicker(Platform.OS === 'ios');
      
      console.log("📅 Nova data selecionada:", currentDate);
      console.log("📅 toISOString():", currentDate ? currentDate.toISOString() : 'null');
      console.log("📅 Formatted YYYY-MM-DD:", currentDate ? currentDate.toISOString().split('T')[0] : 'null');
      
      // Formatar manualmente para comparar
      if (currentDate) {
          const year = currentDate.getFullYear();
          const month = String(currentDate.getMonth() + 1).padStart(2, '0');
          const day = String(currentDate.getDate()).padStart(2, '0');
          const manualFormat = `${year}-${month}-${day}`;
          console.log("📅 Formato manual:", manualFormat);
      }
      
      setSelectedDate(currentDate);
      console.log("=== FIM onDateChange ===\n");
  };

  // Função para mostrar o seletor de data
  const showDatepicker = () => {
    setShowDatePicker(true);
  };

  // 🧹 FUNÇÃO PARA LIMPEZA FORÇADA SEM CONFIRMAÇÃO
  const forceCleanAllData = async (landId, dateString) => {
    try {
      console.log(`🧹 LIMPEZA FORÇADA para ${landId} em ${dateString}`);

      const dailyContributionsCollectionRef = collection(db, 'daily_contributions');
      const q = query(
        dailyContributionsCollectionRef,
        where('landId', '==', landId),
        where('date', '==', dateString)
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const batch = writeBatch(db);
        let deleteCount = 0;

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          console.log(`🗑️ FORÇANDO remoção: ${doc.id} - ${data.kingdom_name}`);
          batch.delete(doc.ref);
          deleteCount++;
        });

        await batch.commit();
        console.log(`✅ LIMPEZA FORÇADA: ${deleteCount} documentos removidos`);

        // Aguardar um pouco para o Firebase processar
        await new Promise(resolve => setTimeout(resolve, 2000));

        return deleteCount;
      }

      return 0;

    } catch (error) {
      console.error('❌ Erro na limpeza forçada:', error);
      throw error;
    }
  };

  // 🔄 NOVA VERSÃO do handleUpdateRanking COM LIMPEZA FORÇADA
  const handleUpdateRanking = async (landId) => {
    console.log(`🎯 handleUpdateRanking INICIADO para ${landId}`);

    if (landId === 'add-new-terrain' || landId === 'delete-selected-terrain') {
      return;
    }

    if (!db || !selectedDate) {
      Alert.alert('Erro', 'Requisitos não atendidos');
      return;
    }

    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const dateStringForCollection = `${year}-${month}-${day}`;

    console.log(`🎯 Processando ${landId} para ${dateStringForCollection}`);

    setRankingLoading(true);

    try {
      // 1. LIMPEZA FORÇADA PRIMEIRO
      console.log(`🧹 STEP 1: Limpeza forçada`);
      const deletedCount = await forceCleanAllData(landId, dateStringForCollection);
      console.log(`✅ STEP 1 COMPLETO: ${deletedCount} documentos removidos`);

      // 2. BUSCAR DADOS DA API
      console.log(`📡 STEP 2: Buscando dados da API`);
      const contributionsAPI = await fetchLandContribution(landId, dateStringForCollection, dateStringForCollection);
      console.log(`✅ STEP 2 COMPLETO: ${contributionsAPI?.length || 0} registros da API`);

      if (contributionsAPI && contributionsAPI.length > 0) {
        // 3. SALVAR DADOS NOVOS
        console.log(`💾 STEP 3: Salvando ${contributionsAPI.length} registros`);
        const batch = writeBatch(db);

        contributionsAPI.forEach((contribution, index) => {
          const docId = `${landId}_${contribution.kingdomId}_${dateStringForCollection}`;
          const docRef = doc(db, 'daily_contributions', docId);

          const dailyData = {
            landId: landId,
            kingdomId: contribution.kingdomId,
            date: dateStringForCollection,
            contribution_amount: contribution.total,
            kingdom_name: contribution.name,
            continent: contribution.continent,
            timestamp: new Date()
          };

          batch.set(docRef, dailyData);
          console.log(`✅ Batch ${index + 1}/${contributionsAPI.length}: ${contribution.name} - ${contribution.total}`);
        });

        await batch.commit();
        console.log(`✅ STEP 3 COMPLETO: Batch commit realizado`);

        Alert.alert('Sucesso!', `✅ Dados atualizados!\n❌ Removidos: ${deletedCount}\n✅ Adicionados: ${contributionsAPI.length}`);

      } else {
        Alert.alert('Atenção', `Nenhum dado encontrado na API para ${dateStringForCollection}`);
      }

    } catch (error) {
      console.error("❌ Erro no processo:", error);
      Alert.alert('Erro', 'Erro: ' + error.message);
    } finally {
      setRankingLoading(false);
    }
  };

  // Função para adicionar Terreno ao Firebase (agora será chamada pelo modal)
  const addTerrainToFirebase = async (terrainData) => {
    if (!db || !user) {
      console.error("Dashboard: Database ou usuário não pronto para adicionar terreno.");
      Alert.alert("Erro", "Serviço indisponível. Tente novamente mais tarde."); // Usando Alert nativo
      return;
    }

    const userId = user.uid;
    const terrainId = terrainData.id; // Usamos o ID do terreno como ID do documento

    if (!terrainId) {
      Alert.alert("Erro", "ID do terreno é obrigatório."); // Usando Alert nativo
      console.error("Dashboard: Tentativa de adicionar terreno sem ID.");
      return;
    }

    try {
      const terrainDocRef = doc(db, `users/${userId}/terrenos`, terrainId);
      await setDoc(terrainDocRef, terrainData); // Usa setDoc com o ID fornecido

      console.log(`Dashboard: Terreno ${terrainId} adicionado ao Firebase para o usuário ${userId}.`);
      // Feedback visual de sucesso - pode ser um toast ou apenas o update instantâneo na tela
      // Alert.alert(`Terreno ${terrainData.name || terrainId} adicionado com sucesso!`); // Removido alert para feedback instantâneo

    } catch (error) {
      console.error("Dashboard: Erro ao adicionar terreno ao Firebase:", error);
      Alert.alert("Erro", "Erro ao adicionar terreno. Verifique o ID e tente novamente."); // Usando Alert nativo
    }
  };

  // Função para remover Terreno do Firebase (chamada após confirmação do novo modal)
  const removeTerrainFromFirebase = async (landId) => {
      if (!db || !user) {
          console.error("Dashboard: Database ou usuário não pronto para remover terreno.");
          Alert.alert("Erro", "Serviço indisponível. Tente novamente mais tarde."); // Usando Alert nativo
          return;
      }
      if (!landId) {
          console.error("Dashboard: Tentativa de remover terreno sem ID.");
          Alert.alert("Erro", "ID do terreno para remover é obrigatório."); // Usando Alert nativo
          return;
      }

      const userId = user.uid;
      const terrainDocRef = doc(db, `users/${userId}/terrenos`, landId);

      try {
          await deleteDoc(terrainDocRef);
          console.log(`Dashboard: Terreno ${landId} removido do Firebase para o usuário ${userId}.`);
          // Feedback visual de sucesso - pode ser um toast ou apenas o update instantâneo na tela
          // Alert.alert(`Terreno ${landId} removido com sucesso!`); // Removido alert para feedback instantâneo

          // Após remover, limpamos o ID do terreno a ser deletado e fechamos o modal
          setTerrainToDeleteId(null);
          setIsDeleteModalVisible(false); // Usa o novo estado
      } catch (error) {
          console.error("Dashboard: Erro ao remover terreno do Firebase:", error);
          Alert.alert("Erro", "Erro ao remover terreno. Tente novamente."); // Usando Alert nativo
          // Fechamos o modal mesmo em caso de erro
          setTerrainToDeleteId(null);
          setIsDeleteModalVisible(false); // Usa o novo estado
      }
  };

  // Handle the selection of the "Add New Terrain" card or a real terrain
  const handleSelectLand = (landId) => {
      if (landId === 'add-new-terrain') {
          setIsAddModalVisible(true); // Abre o modal de adição
          // Não seleciona o card de adicionar novo como selectedLandId
      } else if (landId === 'delete-selected-terrain') {
          // Verifica se há um terreno real selecionado para apagar
          if (selectedLandId && selectedLandId !== 'add-new-terrain') {
              // Encontra os dados do terreno selecionado para mostrar no modal de confirmação
              const terrainToConfirm = userTerrains.find(t => t.id === selectedLandId && !t.isAddNewCard && !t.isDeleteCard);
              if (terrainToConfirm) {
                 setTerrainToDeleteId(selectedLandId); // Armazena o ID para exclusão
                 setIsDeleteModalVisible(true); // Abre o modal de confirmação (usando o novo estado)
              } else {
                 Alert.alert("Atenção", "Selecione um terreno válido no carrossel para poder apagá-lo.");
                 setSelectedLandId(null); // Opcional: deseleciona o card de apagar
              }
          } else {
              Alert.alert("Atenção", "Selecione um terreno no carrossel para poder apagá-lo.");
              setSelectedLandId(null); // Opcional: deseleciona o card de apagar
          }
          // Não seleciona o card de apagar como selectedLandId
      }
      else {
          setSelectedLandId(landId); // Seleciona um terreno real
      }
  };

  const handleCloseAddModal = () => {
    setIsAddModalVisible(false); // Fecha o modal de adição
  };

  // Funções para o novo modal de confirmação de exclusão
  const handleConfirmDelete = () => {
      if (terrainToDeleteId) {
          removeTerrainFromFirebase(terrainToDeleteId); // Chama a função de remoção
      } else {
          console.error("Tentativa de confirmar exclusão sem um terreno selecionado.");
          Alert.alert("Erro", "Não foi possível identificar o terreno para excluir.");
          setIsDeleteModalVisible(false); // Usa o novo estado
      }
  };

  const handleCancelDelete = () => {
      setTerrainToDeleteId(null); // Limpa o ID do terreno a ser deletado
      setIsDeleteModalVisible(false); // Usa o novo estado
  };

  // >>> Prepara os dados para o modal de confirmação
  // Encontra os dados do terreno selecionado para exibir no modal de confirmação
  // Buscamos o terrainToDeleteId, que é definido quando o card de exclusão é clicado
  const terrainDataForConfirmation = userTerrains.find(t => t.id === terrainToDeleteId && !t.isAddNewCard && !t.isDeleteCard);
  // Adicionamos o terrainToDeleteId às props para o modal de confirmação saber qual ID usar
  const confirmationModalProps = {
      visible: isDeleteModalVisible, // Usa o novo estado de visibilidade
      onClose: handleCancelDelete, // Cancelar fecha o modal
      onConfirm: handleConfirmDelete, // Função a ser chamada ao confirmar
      // Passamos os dados do terreno para exibição no modal (opcional, depende do layout do modal)
      terrainData: terrainDataForConfirmation, // Passa os dados do terreno para exclusão
  };
  // <<< Fim da preparação dos dados para o modal de confirmação

  if (loading) { // This loading state is for the initial loading of user terrains
    return (
      <View style={[
        styles.loadingContainer,
        { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }
      ]}>
        <ActivityIndicator size="large" color="#6a1b9a" />
        {/* Garante que o texto está dentro de <Text> */}
        <Text style={styles.loadingText}>Carregando autenticação...</Text>
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
        {/* Garante que o texto do cabeçalho está dentro de <Text> */}
        <Text style={styles.header}>Bem-vindo, {user?.email}!</Text>
        {/* Call the handleSignOut prop */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          {/* Garante que o texto do botão sair está dentro de <Text> */}
          <Text style={styles.signOutButtonText}>Sair</Text>
        </TouchableOpacity>
      </View>

      {/* Adicione um botão temporário para testar: 
      <TouchableOpacity onPress={debugAPIDirectly} style={{ backgroundColor: 'red', padding: 10 }}>
        <Text style={{ color: 'white' }}>Debug API</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={testAPIURL} style={{ backgroundColor: 'blue', padding: 10 }}>
        <Text style={{ color: 'white' }}>Test URL Direta</Text>
      </TouchableOpacity>
      */}

      {/* Carrossel dos terrenos do usuário */}
      {/* Removido o título "Meus Terrenos" - NOTA: O título está dentro do componente TerrainsCarousel, precisa ser modificado lá. */}
      <TerrainsCarousel
        terrains={userTerrains} // Pass the user's terrains including the add new card and delete card
        onSelectLand={handleSelectLand} // Use the new handler
        onUpdateRanking={handleUpdateRanking} // This will now trigger the daily data collection
        selectedLandId={selectedLandId} // Pass selectedLandId to highlight
      />

      {/* NOVO: Seção de Seleção de Data usando DateTimePicker */}
      {selectedLandId && selectedLandId !== 'add-new-terrain' && selectedLandId !== 'delete-selected-terrain' && (
         <View style={styles.dateSelectionContainerTop}>
              <Text style={styles.dateSelectionLabel}>Ranking da Data:</Text>
              <TouchableOpacity onPress={showDatepicker} style={styles.dateDisplayButton}>
                 <Text style={styles.dateDisplayText}>
                     {selectedDate ? selectedDate.toLocaleDateString() : 'Selecionar Data'}
                 </Text>
              </TouchableOpacity>

              {/* DateTimePicker (condicionalmente renderizado) */}
              {showDatePicker && (
                  <DateTimePicker
                      testID="dateTimePicker"
                      value={selectedDate || new Date()} // Use selectedDate ou a data atual como valor inicial
                      mode="date" // Modo de seleção de data
                      display="default" // Estilo de exibição (depende da plataforma)
                      onChange={onDateChange} // Handler para a mudança de data
                      maximumDate={new Date()} // Impede a seleção de datas futuras
                  />
              )}
          </View>
      )}

      {/* Seção de exibição do Ranking (agora flex: 1) */}
      {selectedLandId && selectedLandId !== 'add-new-terrain' && selectedLandId !== 'delete-selected-terrain' && (
        <View style={styles.rankingSection}>

           {/* NOVO: Texto informativo do Ranking (ID, Nome, Qtd Itens) */}
           <View style={styles.rankingInfoBar}>
              <Text style={styles.rankingInfoId}>{`#${selectedLandId}`}</Text> {/* ID do terreno */}
              {/* Encontra o nome do terreno pelo selectedLandId */}
              <Text style={styles.rankingInfoName}>{userTerrains.find(t => t.id === selectedLandId)?.name || 'Terreno Desconhecido'}</Text> {/* Nome do terreno */}
              <Text style={styles.rankingInfoCount}>{`${ranking.length} itens`}</Text> {/* Quantidade de itens no ranking */}
           </View>


          {/* Área de Exibição do Ranking (Loading, Lista ou Placeholder) */}
          {rankingLoading ? (
              <View style={styles.rankingLoadingContainer}>
                 <ActivityIndicator size="small" color="#6a1b9a" />
                 <Text style={styles.rankingLoadingText}>Carregando ranking...</Text>
              </View>
          ) : ranking.length > 0 ? (
             <FlatList
               data={ranking}
               renderItem={({ item }) => <RankingItem item={item} />} // RankingItem needs to be re-added or defined
               keyExtractor={item => item.id}
               style={styles.listContainer}
               // Certifique-se de que RankingItem está definido ou importado
             />
          ) : (
             <View style={styles.rankingCard}>
               <Text style={styles.rankingPlaceholderText}>Ainda não há dados de ranking para este terreno na data selecionada.</Text>
             </View>
          )}
        </View>
      )}


      {/* Renderiza o modal de adição de terreno */}
      <AddTerrainModal
        visible={isAddModalVisible}
        onClose={handleCloseAddModal}
        onAddTerrain={addTerrainToFirebase} // Passa a função de adicionar para o modal
      />

      {/* Renderiza o modal de confirmação de exclusão */}
      <DeleteConfirmationModal
          visible={isDeleteModalVisible} // Usa o novo estado de visibilidade
          onClose={handleCancelDelete} // Cancelar fecha o modal
          onConfirm={handleConfirmDelete} // Função a ser chamada ao confirmar
          terrainData={terrainDataForConfirmation} // Passa os dados do terreno para exclusão
      />
    </View>
  );
};

// O componente para renderizar um item do ranking (RE-ADICIONADO AQUI)
const RankingItem = ({ item }) => {
  // Mantendo o estilo simples por enquanto para verificar a renderização básica
  return (
    <View style={styles.simpleRankingItem}>
      {/* Exibe a posição, nome e contribuição como texto simples */}
      <Text style={styles.simpleRankingText}>#{item.position} - {String(item?.kingdom_name || 'Sem nome')}: {item.contribution_amount != null ? String(item.contribution_amount.toLocaleString()) : 'N/A'}</Text>
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
  // REMOVIDOS os estilos antigos do RankingItem
  // rankingItem: { ... },
  // topRankingItem: { ... },
  // rankingPosition: { ... },
  // gold: { ... },
  // silver: { ... },
  // bronze: { ... },
  // rankingPositionText: { ... },
  // rankingInfo: { ... },
  // rankingName: { ... },
  // topRankingName: { ... },
  // rankingTotal: { ... },
  // NOVO: Estilo simples para o RankingItem
  simpleRankingItem: {
      paddingVertical: 8,
      paddingHorizontal: 15,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
  },
  simpleRankingText: {
      fontSize: 16,
      color: '#333',
  },
  // NOVO: Estilos para a seção de ranking e seleção de data
  rankingSection: {
    marginTop: 20,
    flex: 1, // Added flex: 1 here
  },
   // NOVO: Estilo para o contêiner de seleção de data no topo
  dateSelectionContainerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Centraliza a seleção de data
    marginBottom: 15, // Espaço abaixo da seleção de data
    marginTop: 10, // Espaço acima da seleção de data (abaixo do cabeçalho)
    paddingHorizontal: 20, // Adiciona padding nas laterais
    backgroundColor: '#fff', // Fundo branco para destacar
    paddingVertical: 10, // Espaço interno vertical
    borderRadius: 8, // Bordas arredondadas
    marginHorizontal: 10, // Margem nas laterais para não grudar nas bordas da tela
    shadowColor: '#000', // Sombra sutil
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  dateSelectionContainer: { // Estilo antigo, mantido caso precise de outro contêiner de data
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Centraliza a seleção de data
    marginBottom: 15,
    paddingHorizontal: 20, // Adiciona padding nas laterais
  },
  dateSelectionLabel: {
    fontSize: 16,
    color: '#555',
    marginRight: 10,
  },
  // REMOVIDOS os estilos antigos dos inputs de data
  // dateInput: { ... },
  // dateInputYear: { ... },
  // dateSeparator: { ... },
  // NOVO: Estilos para o botão de exibição da data
  dateDisplayButton: {
      paddingVertical: 8,
      paddingHorizontal: 15,
      borderRadius: 8,
      backgroundColor: '#eee', // Fundo claro para o botão
  },
  dateDisplayText: {
      fontSize: 16,
      color: '#333',
  },
  debugText: { // Style for the debug text
      fontSize: 12,
      color: '#888',
      textAlign: 'center',
      marginBottom: 10,
  },
  // NOVO: Estilos para a barra de informações do ranking
  rankingInfoBar: {
      flexDirection: 'row',
      justifyContent: 'space-between', // Espalha os elementos
      alignItems: 'center',
      paddingHorizontal: 15, // Mesmo padding horizontal dos itens da lista
      marginBottom: 10, // Espaço abaixo da barra de info e acima da lista
      // Opcional: adicionar um fundo ou borda para destacar
      // backgroundColor: '#f0f0f0',
      // borderBottomWidth: 1,
      // borderBottomColor: '#ddd',
      // paddingVertical: 8,
  },
  rankingInfoId: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#444',
      flex: 1, // Permite que o ID ocupe o espaço necessário à esquerda
  },
  rankingInfoName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#444',
      flex: 2, // Permite que o nome ocupe mais espaço para centralizar
      textAlign: 'center', // Centraliza o texto do nome
  },
  rankingInfoCount: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#444',
      flex: 1, // Permite que a contagem ocupe o espaço necessário à direita
      textAlign: 'right', // Alinha a contagem à direita
  }
});

export default Dashboard;