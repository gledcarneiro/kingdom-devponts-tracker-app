import { db } from '../firebaseConfig.js';
import { collection, writeBatch, doc } from "firebase/firestore";

/**
 * Salva ou atualiza o ranking de um terreno específico no Firestore.
 * @param {string} landId - O ID do terreno.
 * @param {Array<Object>} contributions - Array de contribuições vindo da API.
 */
export const updateLandRankingInFirebase = async (landId, contributions) => {
  if (!contributions || contributions.length === 0) {
    console.log(`Nenhuma contribuição para atualizar no Land ID: ${landId}.`);
    return;
  }

  const batch = writeBatch(db);
  // Caminho da subcoleção: /lands/{landId}/ranking
  const rankingCollectionRef = collection(db, "lands", landId, "ranking");

  contributions.forEach((contribution) => {
    // O ID do documento será o kingdomId
    const kingdomDocRef = doc(rankingCollectionRef, contribution.kingdomId);
    // Mapeamos os dados da API para a estrutura que queremos no Firebase
    const rankingData = {
      name: contribution.name,
      points: contribution.total, // Mapeando 'total' para 'points'
      continent: contribution.continent,
    };
    batch.set(kingdomDocRef, rankingData, { merge: true });
  });

  try {
    await batch.commit();
    console.log(`Ranking do Land ID ${landId} atualizado no Firebase com sucesso!`);
  } catch (error) {
    console.error(`Erro ao atualizar o ranking do Land ID ${landId}:`, error);
  }
};