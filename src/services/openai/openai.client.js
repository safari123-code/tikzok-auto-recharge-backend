/**
 * Stub OpenAI client.
 * Tu peux brancher l’SDK officiel plus tard.
 * Ici on retourne null => le détecteur de langue reste “best effort”.
 */
export function buildOpenAIClient({ env, log }) {
  async function chat() {
    return null;
  }
  return { chat };
}
