import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const DeleteConfirmationModal = ({ visible, onClose, onConfirm, terrainData }) => {
  // terrainData é opcional, mas útil para exibir o nome do terreno no modal

  return (
    <Modal
      visible={visible}
      animationType="fade" // Usando fade para uma transição mais suave para confirmação
      transparent={true}
      onRequestClose={onClose} // Permite fechar pressionando fora ou botão de voltar
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          {/* Título e mensagem de confirmação */}
          <Text style={styles.modalTitle}>Confirmar Exclusão</Text>
          <Text style={styles.modalMessage}>
            Tem certeza que deseja remover o terreno
            {terrainData ? ` "${terrainData.name || terrainData.id}"` : ' selecionado'}?
          </Text>

          {/* Botões de ação */}
          <View style={styles.buttonContainer}>
            {/* Botão Confirmar Exclusão */}
            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={onConfirm} // Chama a função de confirmação passada por prop
            >
              <Text style={styles.buttonText}>Apagar</Text>
            </TouchableOpacity>
            {/* Botão Cancelar */}
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose} // Chama a função de fechar passada por prop
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    maxWidth: 300, // Um pouco menor para um modal de confirmação
  },
  modalTitle: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalMessage: {
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 16,
    color: '#555',
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
  confirmButton: {
    backgroundColor: '#d32f2f', // Cor vermelha para confirmar exclusão
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
});

export default DeleteConfirmationModal;