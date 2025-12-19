import { Handler } from '@netlify/functions';
import { GoogleGenAI } from "@google/genai";

// Helper types
interface ParsedBody {
  name: string;
  job: string;
  phone: string;
  faceBuffer: Buffer | null;
  faceMimeType: string | null;
}

const parseMultipart = (body: string, contentType: string): ParsedBody => {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  const boundary = match ? (match[1] || match[2]) : null;
  
  const result: ParsedBody = { name: '', job: '', phone: '', faceBuffer: null, faceMimeType: null };
  
  if (!boundary) return result;

  const bodyBuffer = Buffer.from(body, 'base64');
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  let lastIndex = 0;
  
  while (true) {
    const startIndex = bodyBuffer.indexOf(boundaryBuffer, lastIndex);
    if (startIndex === -1) break;
    
    const nextTwoBytes = bodyBuffer.slice(startIndex + boundaryBuffer.length, startIndex + boundaryBuffer.length + 2);
    if (nextTwoBytes.toString() === '--') break;

    const startOfPart = startIndex + boundaryBuffer.length + 2;
    const nextBoundaryIndex = bodyBuffer.indexOf(boundaryBuffer, startOfPart);
    if (nextBoundaryIndex === -1) break;
    
    const partBuffer = bodyBuffer.slice(startOfPart, nextBoundaryIndex - 2);
    
    const doubleCRLF = Buffer.from("\r\n\r\n");
    const headerEndIndex = partBuffer.indexOf(doubleCRLF);
    
    if (headerEndIndex !== -1) {
      const headerText = partBuffer.slice(0, headerEndIndex).toString();
      const content = partBuffer.slice(headerEndIndex + 4);
      
      const nameMatch = headerText.match(/name="([^"]+)"/);
      const name = nameMatch ? nameMatch[1] : '';
      
      if (name === 'face') {
        result.faceBuffer = content;
        const typeMatch = headerText.match(/Content-Type: (.+)/i);
        result.faceMimeType = typeMatch ? typeMatch[1].trim() : 'image/jpeg';
      } else if (name === 'name') {
        result.name = content.toString('utf-8');
      } else if (name === 'job') {
        result.job = content.toString('utf-8');
      } else if (name === 'phone') {
        result.phone = content.toString('utf-8');
      }
    }
    
    lastIndex = nextBoundaryIndex;
  }
  
  return result;
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Ưu tiên dùng API_KEY chuẩn, fallback sang BANANA_API_KEY nếu người dùng chưa kịp đổi
    const apiKey = process.env.API_KEY || process.env.BANANA_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Chưa cấu hình API_KEY trên server Netlify." })
      };
    }

    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
    if (!event.body) throw new Error("No body");
    
    const bodyContent = event.isBase64Encoded ? event.body : Buffer.from(event.body).toString('base64');
    const parsed = parseMultipart(bodyContent, contentType);

    if (!parsed.name || !parsed.job || !parsed.phone || !parsed.faceBuffer) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Thiếu thông tin bắt buộc (Tên, Ngành nghề, SĐT, Ảnh)." })
      };
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });

    // Prompt được tối ưu cho model tạo ảnh của Gemini
    const prompt = `
      Create a high-quality, photorealistic image of a premium wooden nameplate on an executive leather desk.
      
      The nameplate is made of dark walnut wood with a luxurious finish.
      On the nameplate, there is embossed golden metallic text with the following content:
      - Line 1: "${parsed.name}" (Large, serif font, professional)
      - Line 2: "${parsed.job}" (Medium size, elegant script or serif font)
      - Line 3: "${parsed.phone}" (Small, sans-serif font)
      
      To the left of the text on the nameplate, include the portrait of the person provided in the input image. 
      Integrate the portrait naturally as if it is printed or engraved in high quality on a metal plate attached to the wood.
      The person should look professional, wearing a business suit.
      
      Background: Blurred office environment (bokeh), cinematic lighting, shallow depth of field focusing on the nameplate.
      Style: 8k resolution, highly detailed, photorealistic, expensive, CEO office aesthetic.
      Ensure the text is spelled correctly in Vietnamese with proper accents.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview', // Model tạo ảnh chuyên nghiệp
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: parsed.faceMimeType || 'image/jpeg',
              data: parsed.faceBuffer.toString('base64')
            }
          }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: "3:4", // Tỷ lệ dọc phù hợp ảnh chân dung/bảng tên
          imageSize: "1K"
        }
      }
    });

    // Trích xuất ảnh từ response
    let imageBase64 = null;
    
    // Duyệt qua các parts để tìm ảnh
   // Trích xuất ảnh từ response
let imageBase64: string | null = null;

// Lấy parts an toàn (tránh undefined)
const parts = response?.candidates?.[0]?.content?.parts ?? [];

for (const part of parts) {
  const data = part?.inlineData?.data;
  if (typeof data === "string" && data.length > 0) {
    imageBase64 = data;
    break;
  }
}

        if (part.inlineData) {
          imageBase64 = part.inlineData.data;
          break;
        }
      }
    }

    if (!imageBase64) {
      throw new Error("AI không trả về dữ liệu ảnh.");
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        image_base64: imageBase64,
        request_id: "req-" + Date.now(),
        prompt_used: prompt
      })
    };

  } catch (error: any) {
    console.error("Function error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Lỗi xử lý tạo ảnh." })
    };
  }
};
