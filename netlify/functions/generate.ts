import type { Handler } from "@netlify/functions";
import { GoogleGenAI } from "@google/genai";

interface ParsedBody {
  name: string;
  job: string;
  phone: string;
  outfit: string;
  portraitStyle: string;
  faceBuffer: Buffer | null;
  faceMimeType: string | null;
}

function json(statusCode: number, payload: unknown) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
    body: JSON.stringify(payload),
  };
}

function sanitizeText(input: string): string {
  return (input || "")
    .toString()
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .trim();
}

function normalizePhone(phone: string): string {
  const digits = (phone || "").replace(/[^\d]/g, "");
  return digits;
}

function parseMultipart(bodyBase64: string, contentType: string): ParsedBody {
  const result: ParsedBody = {
    name: "",
    job: "",
    phone: "",
    outfit: "",
    portraitStyle: "",
    faceBuffer: null,
    faceMimeType: null,
  };

  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  const boundary = match ? (match[1] || match[2]) : null;
  if (!boundary) return result;

  const bodyBuffer = Buffer.from(bodyBase64, "base64");
  const boundaryBuffer = Buffer.from(`--${boundary}`);

  let lastIndex = 0;

  while (true) {
    const startIndex = bodyBuffer.indexOf(boundaryBuffer, lastIndex);
    if (startIndex === -1) break;

    const afterBoundary = startIndex + boundaryBuffer.length;
    const nextTwo = bodyBuffer.slice(afterBoundary, afterBoundary + 2).toString();
    if (nextTwo === "--") break;

    const startOfPart = afterBoundary + 2;
    const nextBoundaryIndex = bodyBuffer.indexOf(boundaryBuffer, startOfPart);
    if (nextBoundaryIndex === -1) break;

    const partBuffer = bodyBuffer.slice(startOfPart, nextBoundaryIndex - 2);

    const doubleCRLF = Buffer.from("\r\n\r\n");
    const headerEndIndex = partBuffer.indexOf(doubleCRLF);
    if (headerEndIndex === -1) {
      lastIndex = nextBoundaryIndex;
      continue;
    }

    const headerText = partBuffer.slice(0, headerEndIndex).toString("utf-8");
    const content = partBuffer.slice(headerEndIndex + 4);

    const nameMatch = headerText.match(/name="([^"]+)"/);
    const fieldName = nameMatch ? nameMatch[1] : "";

    if (fieldName === "face") {
      result.faceBuffer = content;
      const typeMatch = headerText.match(/Content-Type:\s*([^\r\n]+)/i);
      result.faceMimeType = (typeMatch?.[1] || "image/jpeg").trim();
    } else if (fieldName === "name") {
      result.name = sanitizeText(content.toString("utf-8"));
    } else if (fieldName === "job") {
      result.job = sanitizeText(content.toString("utf-8"));
    } else if (fieldName === "phone") {
      result.phone = sanitizeText(content.toString("utf-8"));
    } else if (fieldName === "outfit") {
      result.outfit = sanitizeText(content.toString("utf-8"));
    } else if (fieldName === "portraitStyle") {
      result.portraitStyle = sanitizeText(content.toString("utf-8"));
    }

    lastIndex = nextBoundaryIndex;
  }

  return result;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(204, "");
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || process.env.BANANA_API_KEY;
    if (!apiKey) return json(500, { error: "Missing API_KEY" });

    const contentType = event.headers["content-type"] || event.headers["Content-Type"] || "";
    if (!contentType.toLowerCase().includes("multipart/form-data")) {
      return json(400, { error: "Content-Type must be multipart/form-data" });
    }
    if (!event.body) return json(400, { error: "Empty body" });

    const bodyBase64 = event.isBase64Encoded
      ? event.body
      : Buffer.from(event.body, "utf-8").toString("base64");

    const parsed = parseMultipart(bodyBase64, contentType);

    const name = parsed.name;
    const job = parsed.job; // Optional
    const phone = normalizePhone(parsed.phone);
    const outfit = parsed.outfit || "Business suit";
    const portraitStyle = parsed.portraitStyle || "Realistic";
    const faceFile = parsed.faceBuffer;

    if (!name) return json(400, { error: "Vui lòng nhập Họ và Tên." });
    if (!phone) return json(400, { error: "Vui lòng nhập Số điện thoại." });
    if (!faceFile || faceFile.length === 0) return json(400, { error: "Thiếu ảnh chân dung." });

    const mimeType = parsed.faceMimeType || "image/jpeg";
    const ai = new GoogleGenAI({ apiKey });
    const imageModel = process.env.IMAGE_MODEL || "gemini-3-pro-image-preview";

    // Logic for optional job title
    const jobPromptLine = job 
      ? `Line2 (optional): "${job}"` 
      : `Line2 (optional): (LEAVE BLANK/EMPTY - DO NOT GENERATE TEXT HERE)`;

    const prompt = `
Ultra hyper-realistic, close-up cinematic 3D shot of a luxury dark mahogany wooden nameplate on a premium leather executive desk pad.

- LEFT portrait: embossed relief 3D, must match EXACT facial identity from reference image; do NOT stylize/distort/alter the face; facial likeness is top priority.
- RIGHT text: Imperial Gold embossed; Line1: "${name}"; ${jobPromptLine}; Line3: "${phone}".
- Must render Vietnamese text correctly with proper accents; no font errors.
- Outfit is: "${outfit}"
- Portrait style notes: "${portraitStyle}"
- Background: blurred high-end corporate office, bokeh, cinematic DOF.
- Negative prompt: no watermark, no gibberish text, no warped letters, no face mismatch, no extra fingers, no cartoon/anime.
    `.trim();

    const response = await ai.models.generateContent({
      model: imageModel,
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType,
              data: faceFile.toString("base64"),
            },
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "3:4",
          imageSize: "1K",
        },
      },
    });

    let imageBase64: string | null = null;
    const parts = response?.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        imageBase64 = part.inlineData.data;
        break;
      }
    }

    if (!imageBase64) {
      return json(502, { error: "AI không trả về ảnh. Thử lại sau." });
    }

    return json(200, {
      image_base64: imageBase64,
      request_id: `req-${Date.now()}`,
      prompt_used: prompt,
    });
  } catch (err: any) {
    console.error("Error:", err);
    return json(500, { error: err?.message || "Lỗi xử lý hệ thống." });
  }
};