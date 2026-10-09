# [Install](https://dammeiosvn.github.io/Wedding-Showcase/Install.mobileconfig)

Webclip trưng bày ảnh cưới theo concept **Love Story Keynote + Wedding Gallery**: trắng ngà, đen điện ảnh, chữ tinh tế và những khung hình lớn. Website tĩnh, không cần backend, tài khoản đăng nhập hay token trong trình duyệt.

**Thêm ảnh vào `photos/` → GitHub Actions xử lý ảnh → website tự cập nhật.** Không sửa HTML, JavaScript hoặc khai báo thủ công danh sách ảnh.

## Sử dụng nhanh trên GitHub

1. Trong repo, mở **Settings → Pages → Build and deployment → Source → GitHub Actions**. Thiết lập một lần.
2. Mở `photos/vietnam/` (hoặc một thư mục khác), chọn **Add file → Upload files**, tải ảnh lên và **Commit changes** vào `main`.
3. Vào tab **Actions**, chờ workflow **Build and deploy Wedding Showcase** chuyển xanh.

Nếu bật Pages sau lần push đầu tiên, vào **Actions → Build and deploy Wedding Showcase → Run workflow** để triển khai lại. Không chọn nguồn Pages là nhánh `main`: ảnh cần được xử lý bằng workflow trước.

Khi repo chưa có ảnh, website hiển thị trạng thái trống; không có ảnh cưới mẫu hoặc ảnh lấy từ dịch vụ ngoài.

## Cấu trúc

```text
photos/                      Ảnh gốc, mỗi thư mục có ảnh là một chương
  vietnam/ khmer/ indonesia/ dalat/
data/album.config.json       Nội dung tùy chỉnh (không bị build ghi đè)
public/
  index.html                 HTML ngữ nghĩa, giao diện ban đầu
  css/style.css              Giao diện mobile-first và safe area
  js/                        app, gallery, lightbox, audio, utils
  audio/                     File nhạc tùy chọn
  icons/                     Icon PNG 180, 192, 512 và nguồn SVG
  manifest.webmanifest       Cài vào màn hình chính
  sw.js                      Offline cơ bản và cập nhật có kiểm soát
scripts/
  build-album.mjs            Quét và tối ưu ảnh, sinh album
  check-build.mjs            Kiểm tra đường dẫn, kích thước, metadata và icon
  serve.mjs                  Chạy thử dưới repository subpath
  build-icons.mjs            Tạo lại icon
tests/album.test.mjs         Kiểm thử vòng đời album
.github/workflows/deploy.yml Build, kiểm tra và triển khai Pages
dist/                        Kết quả build, không commit
```

## Chạy trên máy

Cài **Node.js 24 LTS** và Git, rồi chạy trong thư mục repo:

```sh
npm ci
npm test
npm run build
npm run preview
```

Mở `http://localhost:4173/Wedding-Showcase/`. Preview sử dụng đường dẫn thư mục con giống GitHub Pages. Sau khi đổi ảnh/cấu hình, chạy lại `npm run build` và tải lại trang. Không mở `public/index.html` trực tiếp bằng `file://` vì trình duyệt sẽ chặn module/fetch.

## Quản lý ảnh và chương

- Ảnh hỗ trợ: **JPG, JPEG, PNG, WebP, AVIF tĩnh**. HEIC từ iPhone cần xuất/chuyển thành JPG hoặc PNG trước khi tải lên.
- Tải ảnh vào `photos/ten-chuong/`. Thư mục mới có ảnh tự trở thành chương mới; thư mục trống không xuất hiện.
- GitHub không tạo thư mục trống: chọn **Add file → Create new file**, đặt tên `photos/ten-chuong/.gitkeep`, commit rồi tải ảnh vào thư mục đó.
- Thư mục lồng nhau được hỗ trợ: `photos/du-lich/dalat/` tạo chương có mã `du-lich/dalat`.
- Ảnh nằm trực tiếp dưới `photos/` thuộc chương `moments`.
- Đặt tên `001.jpg`, `002.jpg`… để sắp xếp dễ hiểu. Sắp xếp mặc định theo tên tự nhiên, ổn định giữa các lần build.
- Xóa ảnh nguồn rồi commit: ảnh biến mất khỏi album mới. Không chỉnh `dist/data/album.json` bằng tay.

Sharp tự xoay theo EXIF, giữ tỷ lệ, tạo WebP với cạnh dài tối đa **480 / 960 / 1920 px**, không phóng lớn ảnh nguồn và không xuất biến thể trùng kích thước. Metadata EXIF/XMP/IPTC/ICC, gồm thông tin GPS, được bỏ khỏi ảnh tối ưu. Ảnh gốc không được đưa vào bản deploy; với repo công khai, ảnh gốc vẫn có thể được xem trong repo.

ID ảnh dựa trên đường dẫn nguồn; tên ảnh tối ưu chứa dấu vân tay nội dung. Thay nội dung ảnh cùng tên giữ ID nhưng đổi URL ảnh tối ưu, tránh ảnh cũ mắc kẹt trong cache. Đổi tên/di chuyển ảnh sẽ đổi ID và cần sửa các tham chiếu tùy chỉnh tương ứng.

## Đổi nội dung, bìa và chú thích

Sửa `data/album.config.json`. Mọi trường đều tùy chọn. JSON phải đúng cú pháp, không có comment hoặc dấu phẩy thừa.

Ví dụ cấu hình:

```json
{
  "title": "Ngày mình có nhau",
  "hero": {
    "eyebrow": "OUR LOVE STORY",
    "title": "Một đời. Một người.",
    "subtitle": "Và một tình yêu không có ngày kết thúc.",
    "cover": "vietnam/001.jpg"
  },
  "intro": {
    "title": "Những nơi đã đi qua.\nMột người luôn ở lại.",
    "text": "Mỗi khung hình là một lời hẹn."
  },
  "chapterOrder": ["vietnam", "khmer", "dalat"],
  "chapters": {
    "vietnam": {
      "title": "Việt Nam",
      "description": "Nơi câu chuyện bắt đầu.",
      "featured": ["vietnam/001.jpg", "vietnam/002.jpg"]
    }
  },
  "photos": {
    "vietnam/001.jpg": {
      "alt": "Cô dâu và chú rể bên nhau trong ngày cưới",
      "caption": "Một lời hẹn, cho cả cuộc đời.",
      "order": 1,
      "featured": true,
      "focalPoint": [50, 35]
    }
  },
  "footer": {
    "title": "Câu chuyện còn tiếp.",
    "message": "Cùng nhau, qua từng mùa thương nhớ."
  },
  "audio": { "src": "audio/wedding.mp3", "loop": true },
  "gallery": { "pageSize": 24 }
}
```

| Trường | Cách dùng |
| --- | --- |
| `hero.cover` | Đường dẫn tương đối trong `photos/`. Trống: dùng ảnh đầu tiên. Có thể thêm tiền tố `photos/`. |
| `chapterOrder` | Mã thư mục theo thứ tự mong muốn. Chương mới tự xếp sau các chương đã khai báo. |
| `chapters` | Tên/mô tả/chọn ảnh kể chuyện. Không khai báo: lấy tên thư mục và hai ảnh đầu. |
| `photos` | Chỉ khai báo ảnh cần tùy chỉnh. Ảnh mới vẫn tự xuất hiện. |
| `order` | Số nhỏ đứng trước, mặc định 1000. Ảnh cùng thứ tự được sắp theo tên. |
| `featured` | Ưu tiên ảnh kể chuyện. Mỗi chương hiển thị tối đa ba ảnh nổi bật. |
| `focalPoint` | `[x, y]`, từ 0–100, đơn vị phần trăm, áp dụng `object-position`. Bố cục hiện tại giữ tỷ lệ và không cắt ảnh. |
| `pageSize` | Số ảnh thêm mỗi lần trong gallery, giới hạn 12–48. |

Cấu hình được ưu tiên hơn dữ liệu tự quét. Tham chiếu ảnh đã xóa hoặc đường dẫn không hợp lệ sẽ được cảnh báo trong Actions và bỏ qua; cấu hình gốc được giữ nguyên. Không cho phép đọc ảnh bằng đường dẫn ra ngoài `photos/` hoặc qua symlink.

## Nhạc nền

1. Tải nhạc vào `public/audio/wedding.mp3` (hoặc tên khác).
2. Trong cấu hình, đặt `audio.src` thành `audio/wedding.mp3`; bật/tắt lặp bằng `loop`.
3. Commit và đợi workflow triển khai.

Không có file nhạc: nút nhạc tự ẩn. Nhạc không tự phát, không tải trước và không được precache. Người xem chủ động chạm nút nhạc để phát. Khi chuyển ứng dụng sang nền, nhạc dừng; quay lại phải chạm để phát tiếp. Chỉ có một audio instance. File lỗi không làm crash album.

## Lightbox và giao diện iPhone

- Chạm ảnh để xem bản lớn, vuốt ngang để chuyển.
- Chụm/tách hai ngón tay hoặc chạm hai lần để zoom; kéo để xem chi tiết. Khi zoom, vuốt không chuyển ảnh. Giới hạn zoom 4×.
- Nút **Phóng to / Thu về** là thao tác thay thế cho cử chỉ.
- Đóng sẽ trở về đúng vị trí cuộn. Desktop hỗ trợ **Escape**, **←**, **→** và focus trong dialog.
- Ảnh gallery dùng thumbnail/responsive images; ảnh dưới trang tải khi gần vùng xem. Gallery thêm theo từng nhóm; chuyện kể thêm mỗi sáu chương.
- Không chặn zoom toàn trang. Safe area dành cho tai thỏ, thanh trạng thái và Home Indicator; reduced motion được tôn trọng.

Trên iPhone: mở link bằng **Safari → Chia sẻ → Thêm vào Màn hình chính → Thêm**. Sau đó mở biểu tượng Wedding. Không cần cài cấu hình `.mobileconfig`.

## GitHub Actions và triển khai

Push vào `main` hoặc **Run workflow** sẽ chạy:

1. Checkout, Node.js 24, `npm ci`.
2. Kiểm thử pipeline bằng ảnh tổng hợp trong thư mục tạm (không xuất lên website).
3. Quét ảnh, tạo biến thể, merge cấu hình và sinh `dist/data/album.json`.
4. Kiểm tra kết quả và icon; chỉ upload artifact khi đạt.
5. Dùng `configure-pages`, `upload-pages-artifact`, `deploy-pages` chính thức để triển khai `dist/`.

Quyền build: `contents: read`. Quyền deploy: `pages: write`, `id-token: write`. Không có PAT trong frontend. Ảnh hỏng có đuôi được hỗ trợ hoặc ảnh động làm build thất bại rõ ràng, giữ website đang triển khai trước đó. Định dạng không hỗ trợ được cảnh báo và bỏ qua. JSON lỗi cú pháp làm build thất bại; thiếu cấu hình/thiếu ảnh vẫn hợp lệ.

Tất cả tài nguyên dùng đường dẫn tương đối với gốc bản deploy, manifest/scope là `./`, Service Worker chỉ kiểm soát ứng dụng. Đổi tên repo không cần sửa mã nguồn; triển khai lại và dùng link Pages mới.

## Cập nhật và offline

- HTML và `album.json` ưu tiên mạng; mất mạng sẽ dùng bản đã lưu nếu có.
- App shell được gắn phiên bản theo toàn bộ nội dung build. Khi có bản mới, xuất hiện thanh **Cập nhật** ở cuối màn hình, không cần kéo trang xuống cuối.
- Chỉ khi người xem chọn **Cập nhật**, ứng dụng mới kích hoạt worker mới và tải lại. Không tự reload giữa lúc xem lightbox.
- Khi quay lại ứng dụng, website kiểm tra bản mới nếu đã qua một phút; đang mở lâu kiểm tra mỗi năm phút, có mạng trở lại kiểm tra ngay.
- Cache cũ trong phạm vi ứng dụng được dọn sau khi worker mới kích hoạt. Không precache ảnh hoặc nhạc; ảnh từng xem có thể được browser cache giữ, nhưng không bảo đảm mọi ảnh xem được offline.
- Chưa từng mở có mạng: offline có thể không mở được. Mạng chậm có thời gian chờ hữu hạn và nút thử lại, không loading vô hạn.

## Lỗi thường gặp

| Hiện tượng | Kiểm tra |
| --- | --- |
| Actions đỏ ở Configure Pages | Settings → Pages → Source = GitHub Actions, rồi Run workflow. |
| Không thấy ảnh mới | Ảnh nằm trong `photos/`, định dạng đúng, commit vào `main`, workflow xanh, bấm Cập nhật trong webclip. |
| Ảnh HEIC không xuất hiện | Xuất JPG/PNG rồi tải lại. |
| Build lỗi tên một ảnh | Mở thử file trên máy; file có thể hỏng, quá 100 megapixel hoặc là ảnh động. |
| Cấu hình không áp dụng | Kiểm tra đường dẫn/tên file, chữ hoa–thường và cú pháp JSON. |
| Nhạc không hiện | File phải tồn tại trong `public/audio/`, cấu hình dùng `audio/...`, file không rỗng. |
| CSS/ảnh 404 | Dùng link Pages có `/Wedding-Showcase/`, xác nhận nguồn triển khai là workflow. |
| iPhone vẫn thấy bản cũ | Kết nối mạng, quay lại webclip, bấm Cập nhật; nếu cần đóng mở lại. Xóa dữ liệu website trong Safari là biện pháp cuối cùng. |

## Kiểm thử trước khi dùng thực tế

`npm test` kiểm tra thêm ảnh/chương lồng nhau, xóa ảnh, giữ chú thích, EXIF orientation, không phóng lớn nguồn, tên/ID ổn định, build lặp ổn định, AVIF, đường dẫn không an toàn, symlink, ảnh hỏng, định dạng bỏ qua, album trống và cấu hình thiếu/lỗi. `npm run build` kiểm tra toàn bộ biến thể, metadata đã bỏ, đường dẫn và icon.

Checklist kiểm thử thủ công trên **iPhone Safari, Home Screen Web App và desktop**:

- [ ] Tai thỏ, thanh trạng thái, Home Indicator không che nút hoặc chữ; thử màn hình dọc/ngang.
- [ ] Hero ưu tiên tải, cuộn nhanh qua ảnh dọc/ngang không nhảy bố cục rõ rệt.
- [ ] Lightbox: vuốt, pinch, kéo khi zoom, double-tap, nút đóng, đúng vị trí cuộn; desktop Escape/mũi tên/Tab.
- [ ] Nhạc chỉ phát sau chạm; chuyển nền rồi quay lại không tự phát.
- [ ] Deploy thêm/xóa ảnh, thấy thông báo mới, cập nhật đúng mà không tự reload khi đang xem.
- [ ] Thử mạng chậm/offline sau một lần mở có mạng; không crash hoặc loading mãi.
- [ ] Album hàng trăm ảnh: phân trang phản hồi nhanh và không tải tất cả bản lớn.

Kiểm thử trình duyệt mô phỏng không thay thế iPhone thật. Cảm ứng đa điểm, safe area và chính sách audio trên iOS cần kiểm tra trực tiếp trước khi kết luận đạt trên thiết bị.
