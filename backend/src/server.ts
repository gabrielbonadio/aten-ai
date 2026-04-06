import 'dotenv/config';
import app from './app';
import sequelize from './config/database';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Tenta conectar no banco primeiro
    await sequelize.authenticate();
    console.log('📦 [Aten AI] Conexão com o banco de dados MySQL estabelecida com sucesso!');
    
    // Se conectou, sobe a API
    app.listen(PORT, () => {
      console.log(`🚀 [Aten AI] Servidor rodando na porta ${PORT}`);
    });
  } catch (error) {
    console.error('❌ [Aten AI] Erro fatal ao conectar com o banco de dados:', error);
    process.exit(1); // Derruba a aplicação caso o banco esteja offline
  }
};

startServer();