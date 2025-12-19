# Bảng Chức Danh AI (Nameplate Generator)

Ứng dụng web tạo bảng chức danh doanh nhân cao cấp bằng AI, hỗ trợ tiếng Việt.

## Cài đặt & Chạy thử (Local)

1.  **Cài đặt dependencies:**
    ```bash
    npm install
    ```

2.  **Chạy server phát triển:**
    ```bash
    npm run dev
    ```
    Truy cập `http://localhost:5173`.

## Triển khai lên Netlify

1.  Đẩy code lên GitHub.
2.  Vào Netlify, chọn "New site from Git".
3.  Chọn repository của bạn.
4.  Netlify sẽ tự động nhận diện cấu hình từ `netlify.toml`. Bấm **Deploy**.

## Cấu hình Backend (Quan trọng)

Sau khi deploy, vào **Site Configuration > Environment Variables** trên Netlify và thêm:

*   `BANANA_API_KEY`: Key API của dịch vụ AI bạn sử dụng.
*   `BANANA_API_URL`: Endpoint API (ví dụ: `https://your-ai-provider.com/v1/generate`).
*   `BANANA_MODEL`: Tên model (Mặc định: `banana-pro`).

*Lưu ý: Nếu không có API Key, hệ thống sẽ trả về ảnh ngẫu nhiên từ Picsum để demo.*

## Công nghệ sử dụng
*   Frontend: React, TypeScript, Vite, Tailwind CSS.
*   Backend: Netlify Functions (Node.js).
