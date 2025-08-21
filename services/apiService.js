/**
 * Busca os dados de contribuição de um terreno (land) da API da LOK.
 * @param {string} landId - O ID do terreno a ser consultado.
 * @returns {Promise<Array|null>} Um array com os dados de contribuição ou null em caso de erro.
 */
export const fetchLandContribution = async (landId) => {
  // Data final: hoje
  const today = new Date();
  const to = today.toISOString().split('T')[0]; // 'YYYY-MM-DD'

  // Data inicial: 5 dias atrás
  const fiveDaysAgo = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000);
  const from = fiveDaysAgo.toISOString().split('T')[0]; // 'YYYY-MM-DD'

  const url = `https://api-lok-live.leagueofkingdoms.com/api/stat/land/contribution?landId=${landId}&from=${from}&to=${to}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Erro na API para Land ID ${landId}: ${response.statusText}`);
    }
    const data = await response.json();

    // Retornamos apenas o array 'contribution' que contém o ranking
    return data.result && data.contribution ? data.contribution : [];
  } catch (error) {
    console.error("Erro em fetchLandContribution:", error);
    return null;
  }
};