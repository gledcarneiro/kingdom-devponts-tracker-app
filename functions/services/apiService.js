/**
 * Busca os dados de contribuição de um terreno (land) da API da LOK.
 * @param {string} landId - O ID do terreno a ser consultado.
 * @param {string} from - Data inicial no formato 'YYYY-MM-DD' (opcional)
 * @param {string} to - Data final no formato 'YYYY-MM-DD' (opcional)
 * @returns {Promise<Array|null>} Um array com os dados de contribuição ou null em caso de erro.
 */
export const fetchLandContribution = async (landId, from = null, to = null) => {
  // Se não foram fornecidas datas, usar a data de ontem como padrão
  if (!from || !to) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const defaultDate = yesterday.toISOString().split('T')[0];
    from = from || defaultDate;
    to = to || defaultDate;
  }

  const url = `https://api-lok-live.leagueofkingdoms.com/api/stat/land/contribution?landId=${landId}&from=${from}&to=${to}`;

  console.log(`🌐 API Call: ${url}`);
  console.log(`📅 Buscando dados de ${from} até ${to} para terreno ${landId}`);

  try {
    const response = await fetch(url);
    
    console.log(`📡 API Response Status: ${response.status}`);
    
    if (!response.ok) {
      throw new Error(`Erro na API para Land ID ${landId}: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log(`📊 API Response Structure:`, {
      hasResult: !!data.result,
      hasContribution: !!(data.result && data.result.contribution),
      contributionLength: data.result?.contribution?.length || 0
    });

    // A API pode retornar diferentes estruturas dependendo da resposta
    let contributionData = null;
    
    // Estrutura 1: data.result.contribution (mais comum)
    if (data.result && data.result.contribution && Array.isArray(data.result.contribution)) {
      contributionData = data.result.contribution;
    }
    // Estrutura 2: data.contribution (alternativa)
    else if (data.contribution && Array.isArray(data.contribution)) {
      contributionData = data.contribution;
    }
    // Estrutura 3: data é o array diretamente
    else if (Array.isArray(data)) {
      contributionData = data;
    }
    // Estrutura 4: sem dados
    else {
      console.log(`⚠️ Estrutura de resposta não reconhecida para ${landId}:`, data);
      return [];
    }

    console.log(`✅ Dados processados: ${contributionData.length} registros encontrados`);
    
    // Log dos primeiros registros para debug
    if (contributionData.length > 0) {
      console.log(`📋 Primeiros registros da API:`);
      contributionData.slice(0, 3).forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.name}: ${item.total} cristais`);
      });
    }

    return contributionData;
    
  } catch (error) {
    console.error(`❌ Erro em fetchLandContribution para ${landId}:`, error);
    console.error(`❌ URL tentada: ${url}`);
    return null;
  }
};