# CMC FEST — Trick or Click

## Chạy bằng Docker (khuyến nghị)

```bash
cp .env.example .env
# Điền CLOUDFLARE_TUNNEL_TOKEN và ADMIN_TOKEN vào .env
docker compose up -d --build
```

Web chạy trong container `nextfest` ở cổng `3000` và dữ liệu lượt chơi nằm trong Docker volume `nextfest-data`, nên vẫn còn sau khi container được tạo lại. Cloudflared cùng Docker network sẽ tunnel trực tiếp vào `http://nextfest:3000`.

Trong Cloudflare Zero Trust, tạo tunnel rồi thêm Public Hostname:

```text
Hostname: nextfest.qtitpc.cyou
Service: http://nextfest:3000
```

Sao chép token của tunnel vào `CLOUDFLARE_TUNNEL_TOKEN` trong `.env`, đặt `ADMIN_TOKEN` và `ADMIN_PATH` (đường dẫn ngẫu nhiên bí mật như `/admin-bb591658d3`), rồi chạy lệnh compose trên. Khi domain hoạt động, QR mới tạo sẽ là `https://nextfest.qtitpc.cyou/play/<ID-ngẫu-nhiên>`.

Người chơi chỉ dùng link `/play/<ID>`. Dashboard quản trị nằm ở URL ngẫu nhiên bảo mật (mặc định `https://nextfest.qtitpc.cyou/admin-bb591658d3`, route chuẩn `/admin` bị chặn 404 để chống người chơi mò vào); mã `ADMIN_TOKEN` là bắt buộc và API quản trị cũng kiểm tra mã này. Trong mỗi dòng lượt có **Chi tiết**, rồi có thể **Reset lượt** hoặc **Xóa lượt** khi QR/lượt bị lỗi.

Port Docker chỉ bind vào `127.0.0.1`; người ngoài chỉ đi vào qua Cloudflare Tunnel. Nếu máy host đã kết nối Tailscale, mở dashboard private trong Tailnet bằng:

```bash
tailscale serve --https=443 http://127.0.0.1:3000
```

Sau đó dùng `https://<tên-máy>.<tailnet>.ts.net/admin`. Thiết lập ACL Tailscale để chỉ tài khoản Admin của bạn có thể truy cập máy host. Lớp `ADMIN_TOKEN` vẫn được giữ để bảo vệ cả URL Cloudflare public.

## Chạy không dùng Docker

```bash
npm install
npm run build
npm run serve
```

App và API chạy chung ở cổng `3000` (đổi cổng bằng `PORT=39000 npm run serve`). Dữ liệu các lượt chơi được lưu bền vững tại `data/sessions.json`; thư mục này được loại khỏi Git để không vô tình công khai tên/kết quả người chơi.

Vào đường dẫn admin ngẫu nhiên (ví dụ `https://nextfest.qtitpc.cyou/admin-bb591658d3`), nhập `ADMIN_TOKEN` để tạo QR riêng. QR dẫn tới `/play/<id>`; người chơi nhập tên và làm đúng bộ câu hỏi được server chốt cho ID đó. Bảng Admin tự cập nhật mỗi 3 giây với ID, tên, trạng thái, đúng/sai và thời gian hoàn thành.

## Cloudflare Tunnel thủ công

Sau khi build, tunnel phải trỏ tới đúng port của `npm run serve`, ví dụ cấu hình ingress:

```yaml
ingress:
  - hostname: nextfest.qtitpc.cyou
    service: http://localhost:3000
  - service: http_status:404
```

Sau đó tạo CNAME `nextfest.qtitpc.cyou` tới hostname tunnel trong Cloudflare. Khi truy cập bằng domain này, QR tự tạo sẽ dùng đúng URL public `https://nextfest.qtitpc.cyou/play/<id>`.

> QR được hiển thị thông qua dịch vụ tạo QR công khai `api.qrserver.com`; link lượt chơi luôn hiện cạnh QR để Admin vẫn có thể sao chép khi dịch vụ QR tạm thời không tải được.
