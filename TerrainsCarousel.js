import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ImageBackground } from 'react-native';

// O componente para renderizar cada item do carrossel.
// Ele agora precisa receber a prop 'item' e verificar se é o card de adicionar novo ou apagar.
const TerrenoItem = ({ item, onSelect, onUpdate, isSelected }) => {
  // console.log('Rendering TerrenoItem:', item?.id, 'isSelected:', isSelected, 'Item:', item); // Add this log
  const backgroundImage = require('./assets/land.png'); // Imagem de fundo para cards de terreno normais

  // Adicionando uma verificação inicial para garantir que item é um objeto válido
  if (!item || typeof item !== 'object') {
      console.warn('TerrenoItem received invalid item:', item);
      return null; // Não renderiza se o item for inválido
  }

  // Verifica se é o card de adicionar novo
  if (item.isAddNewCard) {
    return (
      <TouchableOpacity
        key={item.id} // Added key here
        onPress={() => onSelect(item.id)} // onSelect deve lidar com o ID 'add-new-terrain'
        style={[styles.terrenoCard, styles.addNewCard]} // Adiciona um estilo específico para o novo card
      >
        <View style={styles.addNewCardContent}>
          <Text style={styles.addNewCardText}>+</Text>
          <Text style={styles.addNewCardLabel}>Adicionar Terreno</Text>
        </View>
      </TouchableOpacity>
    );
  }

  // Verifica se é o card de apagar selecionado
  if (item.isDeleteCard) {
    return (
      <TouchableOpacity
        key={item.id} // Added key here
        onPress={() => onSelect(item.id)} // onSelect deve lidar com o ID 'delete-selected-terrain'
        style={[styles.terrenoCard, styles.deleteCard]} // Adiciona um estilo específico para o card de exclusão
      >
        <View style={styles.deleteCardContent}>
          <Text style={styles.deleteCardText}>-</Text>
          <Text style={styles.deleteCardLabel}>Apagar Selecionado</Text>
        </View>
      </TouchableOpacity>
    );
  }

  // Renderiza um card de terreno normal
  return (
    <TouchableOpacity
      key={item.id} // Use o ID do item como key
      onPress={() => onSelect(item.id)}
      onLongPress={() => onUpdate && onUpdate(item.id)}
      style={[styles.terrenoCard, isSelected && styles.selectedCard]} // Adiciona estilo para card selecionado
    >
      <ImageBackground
        source={backgroundImage}
        style={styles.cardBackground} // Estilo ajustado para ImageBackground
        imageStyle={styles.cardBackgroundImage}
      >
        <View style={styles.cardContent}>
          <Text style={styles.terrenoName}>{String(item.name || 'Terreno sem nome')}</Text>

          <View style={styles.pointsContainer}>
            <Text style={styles.pointsText}>
              {item.latestDailyContribution?.contribution_amount != null
                ? String(item.latestDailyContribution.contribution_amount.toLocaleString())
                : (item.points != null ? String(item.points.toLocaleString()) : 'N/A')}
            </Text>
          </View>

          <View style={styles.bottomInfoContainer}>
            <Text style={styles.levelText}>Lvl {String(item.level || '?')}</Text>
            <View style={styles.idContainer}>
              <Text style={styles.idText}>#{String(item.id)}</Text>
            </View>
          </View>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
};

// O componente do carrossel
// Agora recebe 'terrains' como prop
const TerrainsCarousel = ({ terrains, onSelectLand, onUpdateRanking, selectedLandId }) => {
  return (
    <View>
      {/* <Text style={styles.carouselTitle}>Meus Terrenos</Text> // Título mais relevante */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.carouselScrollView}
        contentContainerStyle={styles.carouselContentContainer}
      >
        {/* CORREÇÃO: Comentários JSX devem usar {/* */}
        <View style={{ flexDirection: 'row' }}>
          {terrains && Array.isArray(terrains) && terrains.map((item) => {
            // Add a check to ensure the item is a valid object before rendering AND before accessing item.id for the key
            if (item && typeof item === 'object' && item.id != null) { // Check if item is object and has a non-null id
               return (
                 <TerrenoItem
                   key={item.id} // Use o ID do item como key
                   item={item} // Pass the entire item including latestDailyContribution
                   onSelect={onSelectLand}
                   onUpdate={onUpdateRanking} // Corrected prop name
                   isSelected={item.id === selectedLandId} // Passa se o card está selecionado
                 />
               );
            } else {
               console.warn('Skipping invalid item in terrains array during map:', item);
               return null; // Skip rendering invalid items
            }
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  carouselTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#444',
    marginBottom: 8,
    marginTop: 15,
    textAlign: 'center',
  },
  carouselScrollView: {
    paddingVertical: 5,
  },
  carouselContentContainer: { // Estilo para adicionar padding horizontal aos cards
    paddingHorizontal: 10, // Adiciona padding nas laterais do carrossel
  },
  terrenoCard: {
    borderRadius: 16,
    marginHorizontal: 5, // Ajustado para dar mais espaço entre os cards
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    width: 150, // Tamanho um pouco maior para acomodar mais info
    height: 150,
    overflow: 'hidden',
    backgroundColor: '#fff', // Fundo branco padrão
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCard: {
    borderColor: '#6a1b9a', // Cor de destaque para o card selecionado
    borderWidth: 3,
  },
  cardBackground: { // Estilo para a ImageBackground
      flex: 1,
      width: '100%',
      height: '100%',
      justifyContent: 'flex-end', // Alinha o conteúdo na parte inferior
  },
  cardBackgroundImage: {
    resizeMode: 'cover',
  },
  cardContent: { // Conteúdo do card de terreno normal
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)', // Overlay escuro para contraste
    padding: 10,
    justifyContent: 'space-between',
    width: '100%', // Garante que o conteúdo preencha a largura do card
  },
  terrenoName: { // Novo estilo para o nome do terreno
      color: '#fff',
      fontSize: 14,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 5,
  },
  pointsContainer: {
    backgroundColor: 'rgba(110, 108, 108, 0.5)', // Fundo semi-transparente
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 15,
    alignSelf: 'center', // Centraliza o container de pontos
    marginTop: 'auto', // Empurra para baixo
  },
  pointsText: {
    color: '#ffffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  bottomInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10, // Espaço entre pontos e info inferior
  },
  levelText: {
    fontSize: 18, // Tamanho menor para o nível
    fontWeight: 'bold',
    color: '#ffffffff', // Cor branca
  },
  idContainer: {
    backgroundColor: 'rgba(0,0,0,0.6)', // Fundo semi-transparente
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  idText: {
    color: '#fff',
    fontSize: 12, // Tamanho menor para o ID
    fontWeight: 'bold',
  },
  // Estilos para o card "Adicionar Terreno"
  addNewCard: {
      backgroundColor: '#e0e0e0', // Cor de fundo clara
      borderWidth: 2,
      borderColor: '#ccc',
      borderStyle: 'dashed', // Borda tracejada
  },
  addNewCardContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
  },
  addNewCardText: {
      fontSize: 40,
      color: '#888',
      marginBottom: 5,
  },
  addNewCardLabel: {
      fontSize: 14,
      color: '#555',
      fontWeight: 'bold',
  },
  // Estilos para o card "Apagar Selecionado"
  deleteCard: {
      backgroundColor: '#ffcdd2', // Cor de fundo vermelha clara (soft red)
      borderWidth: 2,
      borderColor: '#ef9a9a', // Borda vermelha um pouco mais escura
      borderStyle: 'dashed', // Borda tracejada
  },
  deleteCardContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
  },
  deleteCardText: {
      fontSize: 40,
      color: '#e57373', // Cor vermelha para o sinal de menos
      marginBottom: 5,
  },
  deleteCardLabel: {
      fontSize: 14,
      color: '#d32f2f', // Cor vermelha mais escura para o texto
      fontWeight: 'bold',
  },
});

export default TerrainsCarousel;