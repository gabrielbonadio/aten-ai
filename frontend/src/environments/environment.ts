export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  /**
   * Enquanto não há tela de login: cole aqui um JWT válido (ex.: resposta do POST /auth/login)
   * para o interceptor enviar Authorization. Se null, o header só será enviado se existir token no localStorage.
   */
  devJwtToken: null as string | null
};
