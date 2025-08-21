import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

// Adicionamos novas props para configurar o modal para confirmação
const AddTerrainModal = ({ visible, onClose, onAddTerrain, isConfirmation, confirmationMessage, onConfirm, confirmText = 'Confirmar', cancelText = 'Cancelar', terrainData }) => { // Added terrainData prop here
  // Estados para o formulário de adição (usados apenas quando isConfirmation é falso)
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [level, setLevel] = useState('');
  const [points, setPoints] = useState('');
  const [error, setError] = useState('');

  // Handler para adicionar terreno (usado apenas quando isConfirmation é falso)
  const handleAdd = () => {
    // Validação básica
    if (!id || !name || !level || !points) {
      setError('Por favor, preencha todos os campos.');
      return;
    }
    if (isNaN(level) || isNaN(points)) {
       setError('Nível e Pontos devem ser números.');
       return;
    }

    setError(''); // Limpa erros anteriores

    const newTerrainData = {
      id: id.trim(), // Remove espaços em branco
      name: name.trim(),
      level: parseInt(level, 10), // Converte para número inteiro
      points: parseFloat(points), // Converte para número flutuante
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

  // Handler para confirmar (usado apenas quando isConfirmation é verdadeiro)
  const handleConfirm = () => {
      setError(''); // Limpa erros anteriores
      if (onConfirm) {
          onConfirm(); // Chama a função de confirmação passada por prop
      }
      // Não limpamos os campos de adição aqui, pois eles não são usados neste modo
      // onClose(); // onConfirm ou onCancel devem fechar o modal
  };


  // Handler para fechar (usado em ambos os modos)
  const handleClose = () => {
    // Limpa os campos e erros (para o modo adição) ao fechar
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

            {/* Título do modal */}
            <Text style={styles.modalTitle}>
                {isConfirmation ? 'Confirmar Exclusão' : 'Adicionar Novo Terreno'}
            </Text>

            {/* Exibe erro se houver */}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* Conteúdo condicional baseado no modo (Adição ou Confirmação) */}
            {isConfirmation ? (
              // Conteúdo para o modo de confirmação
              <Text style={styles.confirmationMessageText}>{confirmationMessage}</Text>
            ) : (
              // Conteúdo para o modo de adição (formulário)
              <>
                <TextInput
                  style={styles.input}
                  placeholder="ID do Terreno"
                  value={id}
                  onChangeText={setId}
                  autoCapitalize="none"
                  keyboardType="default" // Pode ser 'number-pad' se o ID for apenas números
                />
                <TextInput
                  style={styles.input}
                  placeholder="Nome do Terreno"
                  value={name}
                  onChangeText={setName}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Nível"
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
              </>
            )}


            <View style={styles.buttonContainer}>
              {isConfirmation ? (
                // Botões para o modo de confirmação
                <>
                  <TouchableOpacity
                    style={[styles.button, styles.deleteConfirmButton]} // Estilo para confirmar exclusão
                    onPress={handleConfirm}
                  >
                    <Text style={styles.buttonText}>{confirmText}</Text>
                  </TouchableOpacity>
                   <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={handleClose} // Cancelar fecha
                  >
                    <Text style={styles.cancelButtonText}>{cancelText}</Text> {/* Texto do botão de cancelar */}
                  </TouchableOpacity>
                </>
              ) : (
                // Botões para o modo de adição
                <>
                  <TouchableOpacity
                    style={[styles.button, styles.addButton]}
                    onPress={handleAdd}
                  >
                    <Text style={styles.buttonText}>Adicionar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={handleClose} // Cancelar fecha
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text> {/* Texto do botão de cancelar */}
                  </TouchableOpacity>
                </>
              )}
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
  scrollViewContent: { // Keep style, even if ScrollView is commented out
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20, // Adiciona padding vertical para ScrollView
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
    width: '90%', // Ocupa 90% da largura
    maxWidth: 400, // Limita a largura máxima em telas maiores
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
    flex: 1, // Permite que os botões ocupem espaço igual
    marginHorizontal: 5, // Espaço entre os botões
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#6a1b9a', // Cor roxa para adicionar
  },
  cancelButton: {
    backgroundColor: '#e0e0e0', // Cor cinza clara para cancelar
  },
  deleteConfirmButton: { // Estilo para o botão de confirmar exclusão
      backgroundColor: '#d32f2f', // Cor vermelha escura para confirmar exclusão
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
   cancelButtonText: { // Estilo para o texto do botão de cancelar (pode ser diferente da cor branca)
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
  confirmationMessageText: { // Estilo para a mensagem de confirmação
      fontSize: 18,
      textAlign: 'center',
      marginBottom: 20,
      color: '#333',
  },
});

export default AddTerrainModal;