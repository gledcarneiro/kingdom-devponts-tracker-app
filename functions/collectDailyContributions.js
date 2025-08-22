// Importe as dependências necessárias
const admin = require('firebase-admin');
const { fetchLandContribution } = require('./services/apiService'); // Importe a função da API

// Inicialize o Firebase Admin SDK
// No ambiente do Cloud Functions, ele geralmente é inicializado automaticamente.
// Se você estiver testando localmente, pode precisar inicializá-lo manualmente.
// admin.initializeApp(); // Descomente se precisar inicializar manualmente para testes locais

// Obtenha a instância do Firestore
const db = admin.firestore();

// Defina a lista de IDs dos terrenos a serem monitorados
const LAND_IDS_TO_MONITOR = [
  '158233',
//   '158489',
//   '158746',
//   '158234', // Novo ID adicionado
];

// Função principal da Cloud Function
exports.collectDailyContributions = async (pubsubEvent, context) => {
  console.log('Cloud Function acionada para coletar contribuições diárias.');

  // Calcule a data de ontem (d-1) no formato YYYY-MM-DD
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const dateStringYesterday = yesterday.toISOString().split('T')[0]; // 'YYYY-MM-DD' (d-1)

  const batch = db.batch(); // Use um batch para escrever múltiplos documentos de forma eficiente

  for (const landId of LAND_IDS_TO_MONITOR) {
    console.log(`Buscando dados para o Land ID: ${landId} para a data: ${dateStringYesterday}`);

    try {
      // Buscar dados para o dia específico (d-1) usando from=to=yesterday
      // Assumindo que a API retorna a contribuição *daquele dia* quando from=to
      const contributionsToday = await fetchLandContribution(landId, dateStringYesterday, dateStringYesterday);

      if (contributionsToday && contributionsToday.length > 0) {
        console.log(`Dados recebidos para Land ID ${landId} na data ${dateStringYesterday}. Processando ${contributionsToday.length} reinos.`);

        let dailyRecordsCount = 0;

        for (const contribution of contributionsToday) {
          // Crie o ID único do documento: landId_kingdomId_YYYY-MM-DD
          const docId = `${landId}_${contribution.kingdomId}_${dateStringYesterday}`;
          const docRef = db.collection('daily_contributions').doc(docId);

          // Prepare os dados para salvar
          const dailyData = {
            landId: landId,
            kingdomId: contribution.kingdomId,
            date: dateStringYesterday,
            // Usar o 'total' retornado pela API diretamente,
            // assumindo que from=to na chamada da API retorna a contribuição daquele dia.
            contribution_amount: contribution.total,
            kingdom_name: contribution.name,
            continent: contribution.continent,
            timestamp: admin.firestore.FieldValue.serverTimestamp() // Opcional: timestamp da gravação
          };

          batch.set(docRef, dailyData); // Adiciona a operação ao batch
          dailyRecordsCount++;
        }
        console.log(`Adicionados ${dailyRecordsCount} registros diários ao batch para Land ID ${landId} em ${dateStringYesterday}.`);

      } else {
        console.log(`Nenhum dado de contribuição encontrado para Land ID ${landId} na data ${dateStringYesterday}.`);
      }
    } catch (error) {
      console.error(`Erro ao processar Land ID ${landId} na data ${dateStringYesterday}:`, error);
      // Continue para o próximo landId mesmo se um falhar
    }
  }

  // Commit o batch para salvar todos os documentos de uma vez
  try {
    if (batch._ops.length > 0) { // Verifica se há operações no batch antes de commitar
       await batch.commit();
       console.log(`Batch commit bem-sucedido. Dados de ${dateStringYesterday} salvos na coleção 'daily_contributions'.`);
    } else {
       console.log(`Nenhuma operação no batch para ${dateStringYesterday}. Nenhum dado salvo.`);
    }
  } catch (error) {
    console.error('Erro ao commitar o batch no Firestore:', error);
    throw new Error('Falha ao salvar dados no Firestore.'); // Lança um erro para que o Cloud Functions saiba que falhou
  }


  console.log('Cloud Function concluída.');
  // Funções Cloud acionadas por Pub/Sub não precisam retornar nada.
};

// Note: Você precisará implantar esta função no Firebase Cloud Functions.
// Certifique-se de que o arquivo './services/apiService.js' e suas dependências
// estejam incluídos na implantação.