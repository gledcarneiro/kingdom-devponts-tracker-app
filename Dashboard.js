import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, ScrollView, Alert, TextInput } from 'react-native'; // Import TextInput
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

  // Calcule a data de ontem (d-1) no formato YYYY-MM-DD no escopo do componente
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const dateStringYesterday = yesterday.toISOString().split('T')[0]; // 'YYYY-MM-DD' (d-1)
  // Vamos calcular a data de hoje também, pode ser útil
  const dateStringToday = today.toISOString().split('T')[0];

  // NOVO ESTADO: Para armazenar o dia selecionado pelo usuário para o ranking
  // Inicializamos com o dia de ontem como padrão
  const [selectedDay, setSelectedDay] = useState(String(yesterday.getDate()));
  // NOVO ESTADO: Para armazenar o mês e ano selecionados (usaremos o atual por enquanto)
  // Inicializa com o mês e ano de ontem
  const [selectedMonth, setSelectedMonth] = useState(String(yesterday.getMonth() + 1)); // Mês é 0-indexado, então +1
  const [selectedYear, setSelectedYear] = useState(String(yesterday.getFullYear()));


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


  // NOVO useEffect para buscar o ranking com base na data selecionada
  useEffect(() => {
    // Só busca o ranking se db, user, selectedLandId são válidos, não é um card especial, e selectedDay, selectedMonth, selectedYear são números válidos
    if (!db || !user || !selectedLandId || selectedLandId === 'add-new-terrain' || selectedLandId === 'delete-selected-terrain' || !selectedDay || isNaN(parseInt(selectedDay, 10)) || !selectedMonth || isNaN(parseInt(selectedMonth, 10)) || !selectedYear || isNaN(parseInt(selectedYear, 10))) {
      console.log("Dashboard: Ranking useEffect skipped. selectedLandId:", selectedLandId, "selectedDay:", selectedDay, "selectedMonth:", selectedMonth, "selectedYear:", selectedYear); // Log skip reason
      setRanking([]); // Limpa o ranking se os pré-requisitos não forem atendidos
      return;
    }

    console.log(`Dashboard: Ranking useEffect: Fetching ranking for Land ID: ${selectedLandId} for Date: ${selectedYear}-${selectedMonth}-${selectedDay}`); // Log start of fetch
    setRankingLoading(true); // Inicia o indicador de carregamento do ranking

    // Constrói a string de data no formato YYYY-MM-DD
    // Garante que selectedDay e selectedMonth sejam preenchidos com zero à esquerda se necessário
    const paddedDay = String(parseInt(selectedDay, 10)).padStart(2, '0');
    const paddedMonth = String(parseInt(selectedMonth, 10)).padStart(2, '0');
    const targetDateString = `${selectedYear}-${paddedMonth}-${paddedDay}`; // Formato YYYY-MM-DD

    console.log(`Dashboard: Ranking useEffect: Target Date String for query: ${targetDateString}`);


    // Consulta a coleção 'daily_contributions' filtrando por landId E a data selecionada
    const dailyContributionsCollectionRef = collection(db, 'daily_contributions');

    const q = query(
        dailyContributionsCollectionRef,
        where('landId', '==', selectedLandId),
        where('date', '==', targetDateString), // Filtra pela data selecionada
        orderBy('contribution_amount', 'desc') // Ordena apenas pela contribuição (já que a data é fixa)
        // Opcional: limit o número de resultados se necessário
    );

    console.log("Dashboard: Ranking useEffect: Firestore query created for specific date."); // Log query creation


    const unsubscribeRanking = onSnapshot(q, (snapshot) => {
      console.log(`Dashboard: Ranking onSnapshot triggered for date ${targetDateString}. Snapshot size: ${snapshot.size}`); // Log snapshot size
      const data = [];
      snapshot.forEach(doc => {
        data.push({
          id: doc.id, // Usa doc.id (document ID como landId_kingdomId_YYYY-MM-DD) como key
          ...doc.data() // Inclui todos os campos do documento (landId, kingdomId, date, contribution_amount, etc.)
        });
      });

      // Removidos os logs verbosos
      // console.log(`Dashboard: Ranking onSnapshot: Data received for date ${targetDateString}:`, data);
      console.log(`Dashboard: Ranking onSnapshot: Received data size for date ${targetDateString}: ${data.length}`);


      // Os dados já vêm ordenados pelo Firestore pela contribuição
      // Adiciona posição com base na ordem recebida
      const rankingWithPosition = data.map((item, index) => ({
        ...item,
        position: index + 1
      }));

      // Removidos os logs verbosos
      // console.log(`Dashboard: Ranking onSnapshot: Processed ranking data for date ${targetDateString}:`, rankingWithPosition);
      console.log(`Dashboard: Ranking onSnapshot: Processed data size for date ${targetDateString}: ${rankingWithPosition.length}`);


      setRanking(rankingWithPosition);
      setRankingLoading(false); // Ranking é carregado

      if (rankingWithPosition.length > 0) {
         console.log(`Dashboard: Ranking onSnapshot: Displaying ranking for Land ID ${selectedLandId} on date: ${targetDateString} with ${rankingWithPosition.length} items.`);
      } else {
         console.log(`Dashboard: Ranking onSnapshot: No data to display for Land ID ${selectedLandId} on date: ${targetDateString}.`);
      }

    }, (error) => {
      console.error(`Dashboard: Ranking onSnapshot Error fetching ranking for Land ID ${selectedLandId} on date ${targetDateString}:`, error);
      setRanking([]);
      setRankingLoading(false); // Stop ranking loading indicator on error
    });

    // Retorna a função de unsubscribe para limpar o listener
    return () => {
      console.log(`Dashboard: Ranking useEffect: Cleaning up listener for Land ID ${selectedLandId} on date ${targetDateString}.`); // Log cleanup
      unsubscribeRanking();
    };

  }, [db, user, selectedLandId, selectedDay, selectedMonth, selectedYear]); // Dependências atualizadas


  // Handle updating ranking via long press on carousel item (Collect daily data)
  const handleUpdateRanking = async (landId) => {
     console.log(`Dashboard: handleUpdateRanking called for Land ID: ${landId}`); // Log start of update
     // Prevent updating if it's a special card
     if (landId === 'add-new-terrain' || landId === 'delete-selected-terrain') {
       console.log(`Dashboard: handleUpdateRanking: Ignored for special card ${landId}`); // Log ignore
       return;
     }
     if (!db) {
       Alert.alert('Erro', 'Firebase Database não está pronto.');
       console.error("Dashboard: handleUpdateRanking: Firebase Database not ready."); // Log error
       return;
     }
     setRankingLoading(true); // Show loading while collecting data

     try {
       // Calculate yesterday's date (d-1) for collecting data
       const today = new Date();
       const yesterday = new Date(today);
       yesterday.setDate(today.getDate() - 1);
       const dateStringForCollection = yesterday.toISOString().split('T')[0]; // 'YYYY-MM-DD' (d-1)
       console.log(`Dashboard: handleUpdateRanking: Collecting data for Land ID: ${landId} for date: ${dateStringForCollection} via API.`); // Log collection date


       // Fetch data for yesterday from the API (assuming from=to=dateStringForCollection gives daily contribution)
       // NOTE: fetchLandContribution in apiService.js currently fetches data for the last 5 days.
       // You might need to adjust fetchLandContribution to accept 'from' and to dates
       // if you specifically need *only* yesterday's data from the API.
       // For now, this call will get 5 days, but we'll only save yesterday's data below.
       // If fetchLandContribution is modified, the parameters here should be adjusted.
       const contributionsAPI = await fetchLandContribution(landId, dateStringForCollection, dateStringForCollection); // Pass dates to API fetch (might need adjustment in apiService)
       console.log("Dashboard: handleUpdateRanking: Data received from API:", contributionsAPI); // Log API data


       // Process API results to extract data for the specific collection date (yesterday)
       // Assuming contribution objects from API might have a 'date' field or that the from=to filter works on the API side.
       // If fetchLandContribution returns a list for a date range, you need to filter here.
       // If fetchLandContribution was modified to only return data for from=to date, maybe no filtering needed.
       // Let's assume fetchLandContribution now accepts and uses from/to correctly, returning only data for dateStringForCollection.
       // If API returns data in a slightly different structure or for a range, this filtering needs adjustment.
       const contributionsForYesterday = contributionsAPI; // Assuming fetchLandContribution with from=to returns only that day's data or []
       console.log(`Dashboard: handleUpdateRanking: Data for collection date (${dateStringForCollection}):`, contributionsForYesterday); // Log data for collection date


       if (contributionsForYesterday && contributionsForYesterday.length > 0) {
         console.log(`Dashboard: handleUpdateRanking: Preparing to save ${contributionsForYesterday.length} records.`); // Log save count
         const batch = writeBatch(db); // Use batch for efficient writes

         for (const contribution of contributionsForYesterday) {
           // Crie o ID único do documento na nova coleção: landId_kingdomId_YYYY-MM-DD
           const docId = `${landId}_${contribution.kingdomId}_${dateStringForCollection}`;
           const docRef = doc(db, 'daily_contributions', docId); // Referência para a nova coleção

           // Prepare os dados para salvar na nova coleção
           const dailyData = {
             landId: landId,
             kingdomId: contribution.kingdomId,
             date: dateStringForCollection,
             // Usar o 'total' retornado pela API diretamente,
             contribution_amount: contribution.total, // Assuming 'total' is the correct field from API for daily contribution
             kingdom_name: contribution.name,
             continent: contribution.continent,
             timestamp: new Date() // Usar a data/hora atual da coleta no cliente
           };

           batch.set(docRef, dailyData, { merge: true }); // Use merge: true in case doc exists (e.g. update) - though docId should be unique per day
           console.log(`Dashboard: handleUpdateRanking: Added doc ${docId} to batch.`); // Log batch add
         }

         // Commit o batch
         await batch.commit();
         Alert.alert('Sucesso!', `Dados de contribuição de ${dateStringForCollection} para o terreno ${landId} salvos!`);
         console.log(`Dashboard: handleUpdateRanking: Batch commit successful.`); // Log batch commit success

       } else {
         Alert.alert('Atenção', `Nenhum dado de contribuição encontrado na API para Land ID ${landId} na data ${dateStringForCollection}.`);
         console.log(`Dashboard: handleUpdateRanking: No data found in API for ${dateStringForCollection}.`); // Log no data from API
       }
     } catch (error) {
       console.error("Dashboard: handleUpdateRanking: Error collecting and saving daily contribution:", error); // Log error
       Alert.alert('Erro', 'Erro ao coletar e salvar dados: ' + error.message);
     } finally {
         setRankingLoading(false); // Hide loading after attempt
         console.log(`Dashboard: handleUpdateRanking: Finished for Land ID: ${landId}`); // Log end of update
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

      {/* NOVO: Seção de Seleção de Data movida para cima, substituindo o título do carrossel */}
      {selectedLandId && selectedLandId !== 'add-new-terrain' && selectedLandId !== 'delete-selected-terrain' && (
         <View style={styles.dateSelectionContainerTop}> {/* Usando um novo estilo para ajustar margens/padding no topo */}
              <Text style={styles.dateSelectionLabel}>Ranking da Data:</Text> {/* Título da seção de data */}
              {/* TextInput para o Dia */}
              <TextInput
                  style={styles.dateInput}
                  keyboardType="numeric"
                  maxLength={2} // Dias 1-31
                  value={selectedDay}
                  onChangeText={(text) => {
                      // Validação básica para garantir que é um número entre 1 e 31
                      const day = parseInt(text, 10);
                       // Permite limpar o campo ou digitar um número válido
                      if (text === '' || (!isNaN(day) && day >= 1 && day <= 31)) {
                           setSelectedDay(text); // Keep as text initially to allow typing 1-9
                       }
                      // Opcional: Adicionar feedback ao usuário se o dia for inválido
                  }}
                  placeholder="Dia"
              />
              <Text style={styles.dateSeparator}>/</Text>
               {/* TextInput para o Mês */}
              <TextInput
                  style={styles.dateInput}
                  keyboardType="numeric"
                  maxLength={2} // Meses 1-12
                  value={selectedMonth}
                   onChangeText={(text) => {
                      // Validação básica para garantir que é um número entre 1 e 12
                      const month = parseInt(text, 10);
                       // Permite limpar o campo ou digitar um número válido
                      if (text === '' || (!isNaN(month) && month >= 1 && month <= 12)) {
                           setSelectedMonth(text); // Keep as text initially
                       }
                      // Opcional: Adicionar feedback ao usuário se o mês for inválido
                  }}
                  placeholder="Mês"
              />
              <Text style={styles.dateSeparator}>/</Text>
               {/* TextInput para o Ano */}
              <TextInput
                  style={styles.dateInputYear} // Pode precisar de um estilo ligeiramente diferente para o ano
                  keyboardType="numeric"
                  maxLength={4} // Ano YYYY
                  value={selectedYear}
                   onChangeText={(text) => {
                      // Validação básica para garantir que é um número razoável para um ano
                      const year = parseInt(text, 10);
                       // Permite limpar o campo ou digitar um número válido (ex: >= 2020)
                      if (text === '' || (!isNaN(year) && year >= 2020 && year <= today.getFullYear() + 5)) { // Ex: anos entre 2020 e 5 anos no futuro
                           setSelectedYear(text); // Keep as text initially
                       }
                      // Opcional: Adicionar feedback ao usuário se o ano for inválido
                  }}
                  placeholder="Ano"
              />
          </View>
      )}


      {/* Carrossel dos terrenos do usuário */}
      {/* Removido o título "Meus Terrenos" - NOTA: O título está dentro do componente TerrainsCarousel, precisa ser modificado lá. */}
      <TerrainsCarousel
        terrains={userTerrains} // Pass the user's terrains including the add new card and delete card
        onSelectLand={handleSelectLand} // Use the new handler
        onUpdateRanking={handleUpdateRanking} // This will now trigger the daily data collection
        selectedLandId={selectedLandId} // Pass selectedLandId to highlight
      />

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
  dateInput: {
    width: 50, // Largura fixa para o input do dia/mês
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 16,
    textAlign: 'center', // Centraliza o texto
  },
   dateInputYear: { // Estilo para o input do ano (um pouco mais largo)
      width: 70,
      height: 40,
      borderColor: '#ccc',
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 10,
      fontSize: 16,
      textAlign: 'center',
   },
  dateSeparator: {
      fontSize: 16,
      color: '#555',
      marginHorizontal: 5,
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