import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';

// Dados dos terrenos que você forneceu.
const terrenosData = [
  { id: '158489', name: 'Planície Verdejante', level: 4, points: 1807575 },
  { id: '158233', name: 'Montanhas do Dragão', level: 5, points: 1543200 },
  { id: '3', name: 'Floresta Sombria', level: 3, points: 987650 },
  { id: '4', name: 'Ilha Flutuante', level: 6, points: 2100500 },
];

// O componente para renderizar cada item do carrossel.
const TerrenoItem = ({ item }) => (
  <TouchableOpacity style={styles.terrenoCard}>
    {/* Contêiner da imagem e informações */}
    <View style={styles.cardContent}>
      {/* Contêiner de pontos no topo */}
      <View style={styles.pointsContainer}>
        <Text style={styles.pointsText}>{item.points.toLocaleString()}</Text>
      </View>
      {/* Imagem do terreno - Usamos um placeholder pois não temos a imagem local */}
      <Image
        source={{ uri: 'https://placehold.co/200x200/cccccc/000000?text=Terreno' }}
        style={styles.terrenoImage}
      />
      {/* Informações na parte inferior */}
      <View style={styles.bottomInfoContainer}>
        <Text style={styles.levelText}>{item.level}</Text>
        <View style={styles.idContainer}>
          <Text style={styles.idText}>#{item.id}</Text>
        </View>
      </View>
    </View>
  </TouchableOpacity>
);

// O componente do carrossel
const TerrainsCarousel = () => {
  return (
    <View>
      <Text style={styles.carouselTitle}>Terrenos Disponíveis</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.carouselScrollView}
      >
        {terrenosData.map((item) => (
          <TerrenoItem key={item.id} item={item} />
        ))}
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
  terrenoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    width: 135, // Diminuído para ser mais compacto
  },
  cardContent: {
    padding: 8,
    position: 'relative',
  },
  pointsContainer: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
  pointsText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  terrenoImage: {
    width: '100%',
    height: 85, // Altura da imagem reduzida
    borderRadius: 10,
    resizeMode: 'cover',
  },
  bottomInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  levelText: {
    fontSize: 20, // Tamanho da fonte do nível reduzido
    fontWeight: 'bold',
    color: '#333',
  },
  idContainer: {
    backgroundColor: '#000',
    padding: 5,
    borderRadius: 5,
  },
  idText: {
    color: '#fff',
    fontSize: 10,
  },
});

export default TerrainsCarousel;
