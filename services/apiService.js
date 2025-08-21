/**
 * Busca os dados de contribuição de um terreno (land) da API da LOK.
 * @param {string} landId - O ID do terreno a ser consultado.
 * @returns {Promise<Array|null>} Um array com os dados de contribuição ou null em caso de erro.
 */
export const fetchLandContribution = async (landId) => {
  // As datas podem ser dinâmicas, mas para este exemplo, vamos usar uma data fixa.
  // Em um cenário real, você poderia usar a data atual.
  const today = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD

  const url = `https://api-lok-live.leagueofkingdoms.com/api/stat/land/contribution?landId=${landId}&from=${today}&to=${today}`;

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