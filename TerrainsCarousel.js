import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ImageBackground } from 'react-native';

// Dados dos terrenos que você forneceu.
const terrenosData = [
  { id: '158489', name: 'Planície Verdejante', level: 4, points: 1807575 },
  { id: '158233', name: 'Montanhas do Dragão', level: 5, points: 1543200 },
  { id: '158325', name: 'Floresta Sombria', level: 3, points: 987650 },
  { id: '158424', name: 'Ilha Flutuante', level: 6, points: 2100500 },
];

// O componente para renderizar cada item do carrossel.
const TerrenoItem = ({ item }) => {
  // Usamos require para carregar a imagem local.
  // O caminho é relativo à localização deste arquivo (TerrainsCarousel.js).
  const backgroundImage = require('./assets/land.png');

  return (
    <TouchableOpacity>
      <ImageBackground
        source={backgroundImage}
        style={styles.terrenoCard}
        imageStyle={styles.cardBackgroundImage}
      >
        <View style={styles.cardContent}>
          <View style={styles.pointsContainer}>
            <Text style={styles.pointsText}>{item.points.toLocaleString()}</Text>
          </View>
          <View style={styles.bottomInfoContainer}>
            <Text style={styles.levelText}>{item.level}</Text>
            <View style={styles.idContainer}>
              <Text style={styles.idText}>#{item.id}</Text>
            </View>
          </View>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
};

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
    borderRadius: 16,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    width: 135, // Diminuído para ser mais compacto
    height: 135,
    overflow: 'hidden', // Garante que a imagem com borda arredondada não vaze
  },
  cardBackgroundImage: {
    resizeMode: 'cover',
  },
  cardContent: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)', // Overlay escuro para contraste
    padding: 8, // Reduzido para dar mais espaço
    justifyContent: 'space-between',
  },
  pointsContainer: { // conteiner devpoints
    backgroundColor: 'rgba(110, 108, 108, 0.12)',
    paddingVertical: 2,
    paddingHorizontal: 27,
    borderRadius: 5,
    alignSelf: 'flex-start', // Alinha à direita no topo
  },
  pointsText: { //texto devpoints
    color: '#ffffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  bottomInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  levelText: {   // text level
    fontSize: 35,
    fontWeight: 'bold',
    color: '#000000ff', // Texto branco para contraste
  },
  // seria bom um text conteiner
  
  idContainer: {  // conteiner ID
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 1,
    borderRadius: 5,
    alignSelf: 'flex-end',
    paddingHorizontal: 1,
  },
  idText: { //texto ID
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    textAlign: 'center',    
  },
});

export default TerrainsCarousel;
