
import { GoogleGenAI } from "@google/genai";

export async function getDashboardInsights(dataSummary: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Aja como um analista de dados estratégico da Polícia Militar (TOR). Com base nos seguintes dados de produtividade e operações:
      ${dataSummary}
      
      Forneça um breve resumo executivo (máximo 3 parágrafos) destacando:
      1. Desempenho geral.
      2. Pontos de atenção ou tendências.
      3. Uma sugestão tática.
      Use um tom profissional e direto em Português do Brasil.`,
      config: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40
      }
    });

    return response.text || "Não foi possível gerar insights no momento.";
  } catch (error) {
    console.error("Error generating insights:", error);
    return "Erro ao conectar com a inteligência artificial.";
  }
}
