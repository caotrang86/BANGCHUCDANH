import type { Handler } from "@netlify/functions";
import { GoogleGenAI } from "@google/genai";

/**
 * Parsed multipart body (Netlify Functions receives body as base64 for multipart).
 */
interface ParsedBody {
  name: string;
  job: string;
  phone: string;
  faceBuffer: Buffer | null;
  faceMimeType: string | null;
}

function json(statusCode: number, payload: unknown) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      // Nếu bạn chỉ gọi từ chính site Netlify của bạn thì có thể giữ "*".
      // Khi cần siết chặt, thay bằng domain của bạn.
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
  // Cho phép người dùng nhập có khoảng trắng/dấu chấm/gạch, nhưng chuẩn hóa còn số.
  const digits = (phone || "").replace(/[^\d]/g, "");
  return digits;
}

/**
 * Minimal multipart parser (no external deps).
 * Netlify passes event.body as base64 if isBase64Encoded = true for multipart.
 */
function parseMultipart(bodyBase64: string, contentType: string): ParsedBody {
  const result: ParsedBody = {
    name: "",
    job: "",
    phone: "",
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

    // Check end boundary: "--boundary--"
    const afterBoundary = startIndex + boundaryBuffer.length;
    const nextTwo = bodyBuffer.slice(afterBoundary, afterBoundary + 2).toString();
    if (nextTwo === "--") break;

    // Skip CRLF after boundary
    const startOfPart = afterBoundary + 2;
    const nextBoundaryIndex = bodyBuffer.indexOf(boundaryBuffer, startOfPart);
    if (nextBoundaryIndex === -1) break;

    // Remove trailing \r\n before next boundary
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
    }

    lastIndex = nextBoundaryIndex;
  }

  return result;
}

export const handler: Handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") return json(204, "");

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Phương thức không hợp lệ. Vui lòng dùng POST." });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return json(500, { error: "Chưa cấu hình GEMINI_API_KEY trên Netlify." });
    }

    const contentType =
      event.headers["content-type"] ||
      event.headers["Content-Type"] ||
      "";

    if (!contentType.toLowerCase().includes("multipart/form-data")) {
      return json(400, { error: "Dữ liệu gửi lên không đúng định dạng (multipart/form-data)." });
    }

    if (!event.body) {
      return json(400, { error: "Không nhận được dữ liệu gửi lên." });
    }

    // Với multipart, Netlify thường gửi base64 (isBase64Encoded = true).
    // Nếu không, ta chuyển sang base64 để parser xử lý thống nhất.
    const bodyBase64 = event.isBase64Encoded
      ? event.body
      : Buffer.from(event.body, "utf-8").toString("base64");

    const parsed = parseMultipart(bodyBase64, contentType);

    const name = sanitizeText(parsed.name);
    const job = sanitizeText(parsed.job);
    const phoneRaw = sanitizeText(parsed.phone);
    const phone = normalizePhone(phoneRaw);
    const faceFile = parsed.faceBuffer;

    if (!name) return json(400, { error: "Vui lòng nhập Tên." });
    if (!job) return json(400, { error: "Vui lòng nhập Ngành nghề." });
    if (!phone) return json(400, { error: "Vui lòng nhập Số điện thoại hợp lệ." });
    if (!faceFile || faceFile.length === 0) {
      return json(400, { error: "Vui lòng tải lên ảnh tham chiếu gương mặt (JPG/PNG)." });
    }

    const mimeType = parsed.faceMimeType || "image/jpeg";

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
Tạo một ảnh chân thực (photorealistic) chất lượng cao: một bảng tên gỗ cao cấp đặt trên mặt bàn da trong văn phòng sang trọng.

Yêu cầu bảng tên:
- Gỗ óc chó sẫm màu, hoàn thiện bóng sang trọng.
- Chữ kim loại màu vàng, dập nổi rõ nét, căn chỉnh thẳng hàng, không bị méo.
- Nội dung trên bảng (giữ đúng dấu tiếng Việt, đúng chính tả):
  Dòng 1 (lớn): "${name}"
  Dòng 2 (vừa): "${job}"
  Dòng 3 (nhỏ): "${phoneRaw}"

Ảnh chân dung:
- Dùng ảnh tham chiếu gương mặt được cung cấp.
- Tạo chân dung phong cách doanh nhân, mặc vest, ánh sáng studio.
- Đặt chân dung ở bên trái bảng tên, giống như in/khắc trên một tấm kim loại gắn vào bảng gỗ.

Bối cảnh:
- Hậu cảnh văn phòng mờ (bokeh), ánh sáng điện ảnh, độ sâu trường ảnh nông, tập trung vào bảng tên.
- Tỉ lệ ảnh dọc 3:4, chi tiết cao.
Không có watermark, không có chữ rác, không sai dấu tiếng Việt.
`.trim();

    const imageModel = process.env.IMAGE_MODEL || "gemini-3-pro-image-preview";

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

    // Trích xuất ảnh từ response (an toàn, không lỗi TS)
    let imageBase64: string | null = null;
    const parts = response?.candidates?.[0]?.content?.parts ?? [];

    for (const part of parts) {
      const data = part?.inlineData?.data;
      if (typeof data === "string" && data.length > 0) {
        imageBase64 = data;
        break;
      }
    }

    if (!imageBase64) {
      return json(502, { error: "Model không trả về dữ liệu ảnh. Vui lòng thử lại hoặc đổi IMAGE_MODEL." });
    }

    return json(200, {
      image_base64: imageBase64,
      request_id: `req-${Date.now()}`,
      prompt_used: prompt,
      model_used: imageModel,
    });
  } catch (err: any) {
    console.error("Function error:", err);
    return json(500, { error: err?.message || "Lỗi xử lý tạo ảnh." });
  }
};
