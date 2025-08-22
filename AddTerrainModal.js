import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

// O modal agora será exclusivo para adicionar terrenos
const AddTerrainModal = ({ visible, onClose, onAddTerrain }) => {
  // Estados para o formulário de adição
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [level, setLevel] = useState('');
  const [points, setPoints] = useState('');
  const [error, setError] = useState('');

  // Handler para adicionar terreno
  const handleAdd = () => {
    // Validação básica
    if (!id || !name || !level || !points) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    const parsedLevel = parseInt(level, 10);
    const parsedPoints = parseFloat(points);
    const parsedId = parseInt(id, 10); // Parse ID as integer

    // --- Validações Adicionadas ---
    if (isNaN(parsedLevel) || parsedLevel < 1 || parsedLevel > 10) {
       setError('Nível deve ser um número entre 1 e 10.');
       return;
    }
    if (isNaN(parsedPoints)) {
       setError('Pontos Totais deve ser um número.');
       return;
    }
     if (isNaN(parsedId) || parsedId < 132768 || parsedId > 165535) {
        setError('ID do Terreno inválido. Deve ser um número entre 132768 e 165535.');
        return;
     }
    // ------------------------------

    setError(''); // Limpa erros anteriores

    const newTerrainData = {
      id: String(parsedId), // Armazenar ID como string por consistência com Firebase IDs
      name: name.trim(),
      level: parsedLevel,
      points: parsedPoints,
    };

    // Chama a função passada por prop para adicionar o terreno
    onAddTerrain(newTerrainData);

    // Limpa os campos e fecha o modal após adicionar (ou tentar adicionar)
    setId('');
    setName('');
    setLevel('');
    setPoints('');
    onClose(); // Fecha o modal
  };

  // Handler para fechar
  const handleClose = () => {
    // Limpa os campos e erros ao fechar
    setId('');
    setName('');
    setLevel('');
    setPoints('');
    setError('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.centeredView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          <View style={styles.modalView}>

            {/* Título do modal para Adicionar Terreno */}
            <Text style={styles.modalTitle}>Adicionar Novo Terreno</Text>

            {/* Exibe erro se houver */}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* Conteúdo do formulário de adição */}
            <TextInput
              style={styles.input}
              placeholder="ID do Terreno"
              value={id}
              onChangeText={setId}
              autoCapitalize="none"
              keyboardType="numeric" // Change to numeric keyboard
            />
            <TextInput
              style={styles.input}
              placeholder="Nome do Terreno"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Nível (1-10)" // Update placeholder
              value={level}
              onChangeText={setLevel}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Pontos Totais"
              value={points}
              onChangeText={setPoints}
              keyboardType="numeric"
            />

            <View style={styles.buttonContainer}>
              {/* Botão Adicionar */}
              <TouchableOpacity
                style={[styles.button, styles.addButton]}
                onPress={handleAdd}
              >
                <Text style={styles.buttonText}>Adicionar</Text>
              </TouchableOpacity>
              {/* Botão Cancelar */}
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleClose}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Fundo semi-transparente
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  input: {
    width: '100%',
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 10,
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 10,
  },
  button: {
    borderRadius: 8,
    padding: 10,
    elevation: 2,
    flex: 1,
    marginHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#6a1b9a', // Cor roxa para adicionar
  },
  cancelButton: {
    backgroundColor: '#e0e0e0', // Cor cinza clara para cancelar
  },
   buttonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
   cancelButtonText: {
      color: '#555', // Cor cinza escura para o texto do cancelar
      fontWeight: 'bold',
      textAlign: 'center',
      fontSize: 16,
   },
  errorText: {
    color: '#d32f2f',
    marginBottom: 10,
    textAlign: 'center',
  },
});

export default AddTerrainModal;