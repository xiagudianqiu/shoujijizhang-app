import { GoogleGenAI, Type } from "@google/genai";
import { TransactionType } from "../types";

// Helper to get the AI instance with the key from storage or env
const getGenAI = () => {
  // Try to get from LocalStorage first (for the standalone app)
  const storedKey = localStorage.getItem('gemini_api_key');
  
  // Compatible way to read env vars in Vite (ImportMeta)
  // @ts-ignore
  const envKey = import.meta.env ? import.meta.env.VITE_API_KEY : undefined;
  
  const key = storedKey || envKey;
  
  if (!key) {
    throw new Error("API_KEY_MISSING");
  }
  
  return new GoogleGenAI({ apiKey: key });
};

export interface NLPResult {
  amount: number; // in cents
  type: TransactionType;
  category: string;
  note: string;
  tags?: string[];
  date?: string; // YYYY-MM-DD or similar
  confidence: number;
}

export const parseNaturalLanguageTransaction = async (input: string): Promise<NLPResult | null> => {
  try {
    const ai = getGenAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `你是一个严格的财务记账助手。请解析以下中文交易描述: "${input}". 
      
      规则:
      1. 返回金额单位为【分】 (例如: ¥10.00 返回 1000)。
      2. 从以下标准分类中推断: Food (餐饮), Transport (交通), Shopping (购物), Housing (居住), Salary (薪资), Investment (投资), Other (其他).
         返回对应的英文枚举 Key (例如 "Food", "Transport")。
      3. 类型 (type): EXPENSE (支出), INCOME (收入), TRANSFER (转账).
      4. 如果文本包含 "报销"、"垫付" 等含义，请在 tags 数组中添加 "报销"。
      5. 如果文本包含 "退款"、"退货" 含义，视为【负支出】: 将 amount 设为负数 (例如 -5000)，type 保持为 EXPENSE。
      6. 提取简短的中文备注 (note)。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.INTEGER, description: "金额（分）" },
            type: { type: Type.STRING, enum: [TransactionType.EXPENSE, TransactionType.INCOME, TransactionType.TRANSFER] },
            category: { type: Type.STRING },
            note: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            confidence: { type: Type.NUMBER }
          },
          required: ["amount", "type", "category", "note"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as NLPResult;

  } catch (error: any) {
    if (error.message === "API_KEY_MISSING") {
        console.error("API Key is missing");
        throw error; 
    }
    console.error("Gemini NLP Error:", error);
    return null;
  }
};

export const parseImageTransaction = async (base64Data: string): Promise<NLPResult[]> => {
  try {
    const ai = getGenAI();
    // Remove data URL prefix if present to get just the base64 string
    const cleanBase64 = base64Data.includes('base64,') 
      ? base64Data.split('base64,')[1] 
      : base64Data;
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
            inlineData: {
                mimeType: "image/jpeg", 
                data: cleanBase64
            }
        },
        {
            text: `你是一个财务助手。请分析这张图片（支付截图、银行账单或小票），提取其中所有的交易记录。
            
            要求：
            1. 返回一个包含所有交易的 JSON 数组。
            2. 提取金额（单位：分）。
            3. 判断类型：EXPENSE（支出）或 INCOME（收入）。
            4. 推断分类：Food (餐饮), Transport (交通), Shopping (购物), Housing (居住), Salary (薪资), Investment (投资), Other (其他)。
            5. 提取商户名或关键描述作为 note (例如: "肯德基", "滴滴出行")。
            6. 如果截图包含日期信息，提取为 "YYYY-MM-DD" 格式字符串。
            7. 如果是退款，金额设为负数，类型仍为 EXPENSE，tags包含'退款'。
            8. 如果包含'OCR'或'识别'等字眼，忽略它们。
            9. 如果无法识别任何财务信息，返回空数组。
            `
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
                amount: { type: Type.INTEGER },
                type: { type: Type.STRING, enum: [TransactionType.EXPENSE, TransactionType.INCOME, TransactionType.TRANSFER] },
                category: { type: Type.STRING },
                note: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                date: { type: Type.STRING, description: "YYYY-MM-DD" },
                confidence: { type: Type.NUMBER }
            },
            required: ["amount", "type", "category", "note"]
          }
        }
      }
    });
    
    const text = response.text;
    if (!text) return [];
    
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [parsed];
    
  } catch (error: any) {
    if (error.message === "API_KEY_MISSING") {
        throw error;
    }
    console.error("OCR Error:", error);
    return [];
  }
};