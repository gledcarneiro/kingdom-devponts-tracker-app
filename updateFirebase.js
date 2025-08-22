// Este é um script de backend para ser executado com Node.js
// Ele não faz parte do seu app React Native.
// Para executá-lo: node updateFirebase.js

import { fetchLandContribution } from './functions/services/apiService.js';
import { updateLandRankingInFirebase } from './functions/services/firebaseService.js';
import { db } from './firebaseConfig.js';

// Lista de IDs dos terrenos que você quer monitorar.
// Estes IDs devem corresponder aos IDs no seu LAND_CARDS no app.
const LAND_IDS_TO_UPDATE = [
  '136195', // Exemplo real da sua API
  // Adicione aqui os outros IDs dos seus terrenos
  // 'ID_TERRENO_2',
  // 'ID_TERRENO_3',
];

const runUpdate = async () => {
  console.log('Iniciando processo de atualização do ranking...');
  try {
    for (const landId of LAND_IDS_TO_UPDATE) {
      console.log(`Buscando dados para o Land ID: ${landId}`);
      const contributions = await fetchLandContribution(landId);
      if (contributions) {
        await updateLandRankingInFirebase(landId, contributions);
      } else {
        console.log(`Não foi possível obter dados para o Land ID: ${landId}`);
      }
    }
    console.log('Processo de atualização finalizado.');
  } catch (error) {
    console.error('Erro durante a atualização:', error);
  }
  process.exit(0); // Encerra o script após a execução
};

runUpdate();