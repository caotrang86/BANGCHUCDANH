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
4.  Bấm **Deploy**.

## Cấu hình Backend (Quan trọng)

Sau khi deploy, vào **Site Configuration > Environment Variables** trên Netlify và thêm:

*   `API_KEY`: Key Google Gemini API (bắt buộc).
*   (Tùy chọn) `BANANA_API_KEY`: Nếu bạn đã lỡ cài biến này, hệ thống vẫn sẽ nhận, nhưng khuyến khích dùng `API_KEY`.

Lưu ý: Ứng dụng sử dụng model `gemini-3-pro-image-preview` để đảm bảo chất lượng ảnh cao nhất và khả năng xử lý văn bản tiếng Việt chính xác.

## Công nghệ sử dụng
*   Frontend: React, TypeScript, Vite, Tailwind CSS.
*   Backend: Netlify Functions, Google GenAI SDK.
