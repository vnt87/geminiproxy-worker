[Tiếng Việt](README.md) | [English](README.en.md)

# Gemini API Proxy Worker cho Cloudflare

Project này dành cho ai dùng Gemini free trong Cline mà suốt ngày phải vào thay API Key vì bị rate limit. Cái này cơ bản tạo ra 1 cái relay server giữa máy mình và Google Gemini endpoint, có chứa sẵn 1 list các API Keys mình có, tự động xoay vòng theo kiểu round-robin.

Về cơ bản thì cái này chính là adapt từ [geminiproxy](https://github.com/ChakshuGautam/geminiproxy). Con đấy viết bằng Go nên ai thích dùng Go hoặc deploy docker thì có thể dùng nó, cái này mình adapt lại chuyển qua TypeScript để deploy được trên hệ thống máy chủ free của Cloudflare Worker, đỡ phải deploy trên máy mình

## Features

-   Proxy các yêu cầu đến Gemini API (`generativelanguage.googleapis.com`).
-   Tự động xoay vòng qua nhiều API key của Gemini theo kiểu round-robin.
-   API key được lưu trữ an toàn trong Cloudflare KV.
-   Kiến trúc stateless phù hợp với Cloudflare Workers.
-   Minh bạch với client – client gửi yêu cầu đến URL của Worker như thể đó là Gemini API (sau khi thiết lập ban đầu).
-   Tương thích với LiteLLM (loại bỏ header `Authorization`).
-   Tương thích với các thư viện go-genai client.

## Prerequisites

-   Một tài khoản Cloudflare.
-   Đã cài đặt `npm` và `Node.js`.
-   Đã cài đặt Wrangler CLI (`npm install -g wrangler`).
-   Một hoặc lý tưởng là nhiều API key của Gemini.

## Setup

1.  **Clone Repo**:
    ```bash
    git clone https://github.com/vnt87/gemini-proxy-worker.git
    cd gemini-proxy-worker
    ```
   

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Create KV Namespace:**
    Trong terminal của bạn, chạy lệnh:
    ```bash
    wrangler kv:namespace create GEMINI_KEYS
    ```
    Lệnh này sẽ xuất ra một `id`. Ghi lại ID này.

4.  **Configure `wrangler.toml`:**
    Mở tệp `wrangler.toml` và cập nhật phần `kv_namespaces` với `id` bạn đã nhận được:
    ```toml
    kv_namespaces = [
      { binding = "GEMINI_KEYS", id = "YOUR_ACTUAL_KV_NAMESPACE_ID" } # Thay YOUR_ACTUAL_KV_NAMESPACE_ID bằng ID thực tế của bạn
    ]
    ```

5.  **Prepare and Upload API Keys (Chuẩn Bị và Tải Lên API Keys):**
    a.  Tạo một tệp JSON có tên `gemini-keys.json` (hoặc sử dụng `gemini-keys.json.example` làm mẫu) trong thư mục `geminiproxy-worker`. Tệp này nên chứa các API key Gemini của bạn:
        ```json
        // gemini-keys.json
        [
          {
            "key": "key_0",
            "value": "AIzaSyA...key1"
          },
          {
            "key": "key_1",
            "value": "AIzaSyB...key2"
          },
          {
            "key": "key_2",
            "value": "AIzaSyC...key3"
          }
        ]
        ```
        **Quan trọng:** Đảm bảo `gemini-keys.json` được liệt kê trong tệp `.gitignore` của bạn để tránh commit các key thực tế. Một tệp `gemini-keys.json.example` được cung cấp.

    b.  Tải tệp này lên namespace KV của bạn. Trình quản lý key mong đợi các key được lưu trữ dưới key KV `GEMINI_API_KEYS_CONFIG`.
        ```bash
        wrangler kv:key put --binding=GEMINI_KEYS "GEMINI_API_KEYS_CONFIG" --path="./gemini-keys.json"
        ```
        *Lưu ý: Đảm bảo `wrangler.toml` được cấu hình chính xác với binding `GEMINI_KEYS` trước khi chạy lệnh này.*

### Cập nhật key

Khi nào cần cập nhật key thì trướt tên update file _**gemini-keys.json**_ trước, sau đó chạy file _**update-keys.sh**_ (Linux/Mac) hoặc _**update-keys.bat**_ (Windows)

Các script này sẽ:
- Kiểm tra các file cấu hình cần thiết
- Sao chép từ file .example nếu file gốc không tồn tại
- Kiểm tra cấu trúc JSON
- Thực thi lệnh Wrangler KV bulk put (không cần chuyển đổi)

Với lần cài đặt đầu tiên, bạn có thể cần chỉnh sửa thủ công các file đã sao chép trước khi chạy script.

## Dùng trong Roo Code hoặc Cline

Để cấu hình URL endpoint trong Roo Code:
1. Mở cài đặt Roo Code
2. Tick vào chỗ 'Use custom base URL'
3. Đặt endpoint thành URL Cloudflare Worker của bạn (ví dụ: `https://geminiproxy-worker.<your-subdomain>.workers.dev`)
4. Lưu cài đặt


![Cài đặt Roo Code](screenshots/roo-settings.jpg)

(phần Gemini API Key để nguyên cũng dc, ko có cũng ko sao vì mình ko gọi đến nó, bản thân endpoint của mình đã tích hợp sẵn các API Key rồi)

## Usage (Sử Dụng)

### Local Development

Để kiểm tra Worker cục bộ:
```bash
wrangler dev
```
Lệnh này sẽ khởi động một máy chủ cục bộ (thường là `http://localhost:8787`). Bạn có thể gửi yêu cầu đến điểm cuối này như thể đó là Gemini API. Ví dụ, nếu điểm cuối Gemini API là `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent`, bạn sẽ gửi yêu cầu của mình đến `http://localhost:8787/v1beta/models/gemini-pro:generateContent`.

Worker sẽ nối thêm API key được xoay vòng vào yêu cầu.

### Deployment

Để triển khai Worker lên tài khoản Cloudflare của bạn:
```bash
wrangler deploy
```
Sau khi triển khai, Wrangler sẽ cung cấp cho bạn URL của Worker đã triển khai (ví dụ: `https://geminiproxy-worker.<your-subdomain>.workers.dev`). Sử dụng URL này làm điểm cuối Gemini API trong các ứng dụng client của bạn.

## Debugging

Để xem log thời gian thực từ worker đã triển khai của bạn:
```bash
npx wrangler tail
```
Lệnh này sẽ truyền log từ worker sản xuất của bạn, hiển thị:
- Yêu cầu và phản hồi
- Lỗi
- Sự kiện xoay vòng key
- Hoạt động lưu trữ KV

Nhấn Ctrl+C để dừng luồng log.

## How It Works

1.  Một client gửi yêu cầu đến URL của Cloudflare Worker.
2.  Trình xử lý `fetch` của Worker nhận yêu cầu.
3.  `KeyManager` truy xuất danh sách các API key và chỉ mục xoay vòng hiện tại từ namespace `GEMINI_KEYS` KV.
4.  Nó chọn API key tiếp theo theo kiểu round-robin và cập nhật chỉ mục trong KV cho yêu cầu tiếp theo.
5.  Worker chuyển tiếp yêu cầu gốc đến điểm cuối Gemini API thực tế (`https://generativelanguage.googleapis.com`), nối thêm API key đã chọn làm tham số truy vấn.
6.  Phản hồi từ Gemini API được truyền trực tiếp trở lại client thông qua Worker.

## Contributing

Nếu lỗi thì vô Issues gáy lên nhé các fen. Tôi ko phải dân chuyên code

## License (Giấy Phép)

MIT
