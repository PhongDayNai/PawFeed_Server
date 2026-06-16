SET NAMES utf8mb4;
TRUNCATE TABLE chatbot_wiki;

INSERT INTO chatbot_wiki (
  keyword,
  content,
  created_at,
  updated_at
) VALUES (
  'calibrate,kiểm định,hiệu chuẩn',
  'Để kiểm định (calibrate) máy feeder PawFeed, bạn cần làm theo các bước sau:\n1. Chuẩn bị cốc đo và cân tiểu ly.\n2. Đặt cốc hứng dưới vòi ra thức ăn.\n3. Nhấn giữ nút vật lý trên máy cho ăn trong 5 giây hoặc vào app chọn "Bắt đầu kiểm định".\n4. Máy sẽ chạy thử một lượt thức ăn trong khoảng 10 giây.\n5. Cân lượng thức ăn nhận được (gram) và nhập kết quả vào app.\n6. Hệ thống sẽ tự động tính toán tốc độ dòng chảy (flow rate) và thời gian cho ăn chính xác cho các lần tiếp theo.',
  NOW(),
  NOW()
), (
  'lượng ăn,nhu cầu ăn,rer,der,năng lượng nghỉ ngơi,năng lượng hàng ngày',
  'Công thức tính nhu cầu ăn hàng ngày của thú cưng tại PawFeed dựa trên công thức Năng lượng nghỉ ngơi (RER) và Năng lượng hàng ngày (DER):\n- RER = 70 * (Cân nặng)^0.75\n- DER = RER * Hệ số hoạt động (từ 1.0 đến 3.0 tùy thuộc vào loài chó/mèo, tuổi tác và mức độ hoạt động).\n- Lượng thức ăn (gram) = (DER / Năng lượng của hạt kcal/kg) * 1000.\nBạn có thể nhờ trợ lý Nomi tính toán trực tiếp bằng cách cung cấp thông tin cân nặng, loài, mức độ hoạt động của bé.',
  NOW(),
  NOW()
), (
  'PawFeed,máy cho ăn,máy feeder,thiết bị cho ăn',
  'PawFeed là hệ thống máy cho thú cưng ăn tự động thông minh. Thiết bị hỗ trợ kết nối Wifi, điều khiển từ xa qua Mobile App, đặt lịch ăn tự động định kỳ, kiểm soát liều lượng ăn chính xác bằng cảm biến và thông báo trạng thái hoạt động theo thời gian thực.',
  NOW(),
  NOW()
), (
  'chó con 3 tháng,chó 3 tháng,cún con 3 tháng,cún 3 tháng,chó 3 tháng tuổi,cún 3 tháng tuổi',
  'Đối với chó con 3 tháng tuổi:\n- Số bữa ăn: Nên chia nhỏ thành 3 đến 4 bữa một ngày để giảm tải cho dạ dày còn non nớt.\n- Dạng thức ăn: Thức ăn khô (hạt) nên được ngâm mềm với nước ấm khoảng 10-15 phút trước khi ăn.\n- Lượng ăn: Chia đều lượng thức ăn hàng ngày thành các phần nhỏ bằng nhau.\n- Chăm sóc: Theo dõi sát hoạt động tiêu hóa của bé sau mỗi bữa ăn.',
  NOW(),
  NOW()
), (
  'chó con 2 tháng,chó 2 tháng,cún con 2 tháng,cún 2 tháng,chó 2 tháng tuổi,cún 2 tháng tuổi',
  'Đối với chó con 2 tháng tuổi:\n- Số bữa ăn: Chia nhỏ từ 4 đến 5 bữa một ngày vì đây là giai đoạn bắt đầu cai sữa và tập ăn dặm.\n- Dạng thức ăn: Sử dụng cháo loãng nấu với thịt băm nhuyễn, hoặc hạt khô ngâm nước ấm thật mềm rồi nghiền nát thành bột sệt. Có thể bổ sung sữa bột chuyên dụng cho chó con.\n- LƯU Ý BẮT BUỘC: Nếu bé đi ngoài lỏng liên tục, bỏ ăn, lờ đờ, bạn BẮT BUỘC phải đưa bé đi thú y ngay lập tức để tránh nguy cơ mất nước nguy hiểm.',
  NOW(),
  NOW()
), (
  'mèo con 3 tháng,mèo 3 tháng,mèo con 3 tháng tuổi,mèo 3 tháng tuổi',
  'Đối với mèo con 3 tháng tuổi:\n- Số bữa ăn: Cho ăn 3 đến 4 bữa một ngày để đảm bảo năng lượng phát triển chiều dài xương và cơ bắp.\n- Thức ăn: Có thể cho ăn pate dành cho mèo con trộn với một ít hạt khô đã ngâm mềm để bé làm quen với cơ nhai.\n- Lưu ý: Luôn cung cấp đủ nước sạch bên cạnh đĩa thức ăn.',
  NOW(),
  NOW()
), (
  'mèo con 2 tháng,mèo 2 tháng,mèo con 2 tháng tuổi,mèo 2 tháng tuổi',
  'Đối với mèo con 2 tháng tuổi:\n- Số bữa ăn: Nên ăn 4 đến 5 bữa một ngày do hệ tiêu hóa còn non và dạ dày cực nhỏ.\n- Thức ăn: Pate cho mèo con tập ăn dặm hoặc hạt khô ngâm sữa/nước ấm thật mềm. Tuyệt đối không cho ăn thức ăn cứng.\n- LƯU Ý BẮT BUỘC: Mèo con 2 tháng tuổi rất nhạy cảm với thời tiết và ký sinh trùng. Nếu bé bị nôn mửa, tiêu chảy, chảy nước mũi hoặc sụt cân, bạn BẮT BUỘC phải đưa bé đi cơ sở thú y khám ngay.',
  NOW(),
  NOW()
), (
  'bữa ăn chó con,số bữa ăn chó,tần suất ăn chó',
  'Lịch trình và tần suất bữa ăn khuyến nghị cho chó con theo độ tuổi:\n- Từ khi cai sữa đến 6 tháng tuổi: Nên ăn từ 3 đến 4 bữa một ngày.\n- Từ 6 tháng đến 12 tháng tuổi: Có thể giảm xuống còn 2 đến 3 bữa một ngày.\n- Chó trưởng thành (trên 1 tuổi): Duy trì ổn định từ 1 đến 2 bữa một ngày tùy theo giống chó và mức độ vận động.',
  NOW(),
  NOW()
), (
  'bữa ăn mèo con,số bữa ăn mèo,tần suất ăn mèo',
  'Tần suất bữa ăn khuyến nghị cho mèo con theo độ tuổi:\n- Dưới 4 tháng tuổi: Ăn từ 4 đến 5 bữa một ngày.\n- Từ 4 đến 6 tháng tuổi: Ăn 3 bữa một ngày.\n- Trên 6 tháng tuổi (và mèo trưởng thành): Có thể cho ăn 2 bữa một ngày hoặc chia nhỏ tùy theo thói quen ăn uống của bé.',
  NOW(),
  NOW()
), (
  'thời điểm cho ăn,giờ ăn,khung giờ ăn,thời gian cho ăn',
  'Nguyên tắc thiết lập thời điểm cho ăn phù hợp cho chó mèo:\n- Giờ ăn cố định: Cho ăn vào các khung giờ cố định trong ngày (ví dụ sáng 7h, tối 19h) giúp ổn định hệ tiêu hóa và đồng hồ sinh học.\n- Tránh vận động mạnh: Tuyệt đối không cho thú cưng chạy nhảy, đùa nghịch mạnh trước bữa ăn 30 phút hoặc ngay sau khi ăn xong 1 tiếng để đề phòng nguy cơ xoắn dạ dày chướng hơi vô cùng nguy hại.\n- Bữa tối: Nên cho ăn trước giờ ngủ của bạn từ 2-3 tiếng.',
  NOW(),
  NOW()
), (
  'ăn nhiều quá,ăn quá nhiều,ăn nhiều,quá liều',
  'Khi thú cưng ăn quá nhiều thức ăn trong một lần, có thể xuất hiện các dấu hiệu sau:\n- Triệu chứng: Bụng phình to và căng cứng, thở dốc, lờ đờ uể oải, nôn mửa ra thức ăn chưa tiêu hóa, đi ngoài phân lỏng nhẹ.\n- Hướng xử lý tại nhà: Tạm thời cho bé nhịn ăn bữa tiếp theo (trong khoảng 12 - 24 giờ) để hệ tiêu hóa được nghỉ ngơi. Cung cấp nước sạch từng chút một, tránh uống quá nhiều một lúc.\n- LƯU Ý BẮT BUỘC: Nếu bé nôn mửa liên tục không ngừng, bụng phình to nhanh kèm chảy dãi, lờ đờ mất phản xạ hoặc đi ngoài ra máu, đây là tình trạng cấp cứu nguy hiểm. Bạn BẮT BUỘC phải đưa thú cưng đến phòng khám thú y ngay lập tức.',
  NOW(),
  NOW()
), (
  'mèo con ăn,lịch ăn mèo con,chế độ ăn mèo con',
  'Lịch ăn và lưu ý cho mèo con:\n- Số bữa ăn: Mèo con dưới 6 tháng tuổi cần ăn từ 3 đến 4 bữa một ngày vì dạ dày của bé rất nhỏ nhưng cần nhiều năng lượng để phát triển.\n- Mèo trên 6 tháng tuổi: Có thể giảm dần xuống còn 2 bữa một ngày.\n- Dinh dưỡng đặc biệt: Thức ăn cho mèo con cần chứa hàm lượng protein và các axit amin thiết yếu (như taurine) cao để phát triển toàn diện thị lực, tim mạch và não bộ.',
  NOW(),
  NOW()
), (
  'độc hại,độc,thức ăn độc,thực phẩm độc,không được ăn',
  'Các loại thực phẩm cực kỳ độc hại và cấm kỵ đối với chó mèo:\n1. Sô-cô-la, trà, cà phê: Chứa chất methylxanthines gây ngộ độc tim mạch và hệ thần kinh.\n2. Nho tươi và nho khô: Có thể gây suy thận cấp tính đột ngột.\n3. Hành tây, tỏi: Chứa chất phá hủy hồng cầu, gây thiếu máu nặng.\n4. Hạt mắc ca (macadamia): Gây yếu cơ, sốt, nôn mửa ở chó.\n5. Chất ngọt nhân tạo Xylitol (trong kẹo cao su, bánh ngọt): Gây hạ đường huyết cấp tốc và suy gan cực kỳ nguy hiểm.\n- LƯU Ý BẮT BUỘC: Nếu phát hiện thú cưng lỡ ăn phải bất kỳ thực phẩm độc hại nào trên đây, hãy lập tức đưa bé tới cơ sở thú y gần nhất.',
  NOW(),
  NOW()
), (
  'tiêu chảy,ỉa chảy,đi ngoài lỏng,đi phân lỏng',
  'Cách xử lý khi chó mèo bị tiêu chảy:\n- Tiêu chảy nhẹ (bé vẫn chạy nhảy, tỉnh táo): Cho nhịn ăn trong vòng 12 - 24 tiếng để ruột phục hồi, chỉ cấp nước sạch hoặc nước oresol bù điện giải dành riêng cho thú cưng. Sau đó cho ăn cháo loãng nấu với thịt ức gà xé nhỏ, không nêm gia vị.\n- LƯU Ý BẮT BUỘC: Nếu tiêu chảy liên tục đi kèm nôn mửa, sốt, lờ đờ bỏ ăn hoàn toàn hoặc phân có lẫn máu, có mùi tanh nồng nặc (dấu hiệu của các bệnh truyền nhiễm nguy hiểm như Parvo, Care), bạn BẮT BUỘC phải đưa thú cưng đi thú y ngay lập tức.',
  NOW(),
  NOW()
), (
  'nôn mửa,nôn,ói,trớ',
  'Phân biệt và xử lý khi thú cưng bị nôn mửa:\n- Nôn sinh lý (do ăn quá nhanh, ăn cỏ làm sạch ruột, nôn ra búi lông ở mèo): Bé chỉ nôn 1 lần rồi vẫn vui chơi bình thường. Hãy điều chỉnh lượng ăn nhỏ lại hoặc cho dùng gel tiêu búi lông.\n- Nôn bệnh lý: Bé nôn liên tục nhiều lần trong ngày, nôn ra dịch vàng, dịch xanh hoặc kèm máu, cơ thể lờ đờ mệt mỏi.\n- LƯU Ý BẮT BUỘC: Đối với nôn bệnh lý, không tự ý cho uống thuốc người. Hãy tạm ngưng cho ăn uống và BẮT BUỘC đưa bé đến thú y để bác sĩ kiểm tra nguyên nhân.',
  NOW(),
  NOW()
), (
  'chướng bụng,sình bụng,đầy hơi,bloat,gdv',
  'Hội chứng xoắn dạ dày chướng hơi (GDV - Bloat) cực kỳ nguy hiểm ở chó (đặc biệt giống chó lớn ngực sâu):\n- Triệu chứng: Bụng phình to căng như trống đột ngột sau khi ăn hoặc uống quá nhiều nước rồi vận động mạnh. Bé đi bồn chồn, cố nôn nhưng không nôn được, chảy dãi nhiều, nhịp tim nhanh, khó thở.\n- LƯU Ý BẮT BUỘC: Đây là tình trạng cấp cứu khẩn cấp nguy hiểm đến tính mạng trong vòng vài giờ. Bạn BẮT BUỘC phải mang chó đến cơ sở thú y gần nhất ngay lập tức để luồn ống thông hoặc phẫu thuật cấp cứu, tuyệt đối không chần chừ điều trị tại nhà.',
  NOW(),
  NOW()
), (
  'mất nước,thiếu nước,khô nướu,khô miệng',
  'Dấu hiệu mất nước ở thú cưng và cách xử lý:\n- Kiểm tra: Kéo nhẹ phần da gáy của bé lên rồi buông ra. Nếu da đàn hồi chậm (giữ nguyên nếp nhăn một lúc mới xẹp xuống) hoặc nướu miệng sờ thấy khô và dính dấp, mắt trũng sâu thì bé đang bị mất nước.\n- Xử lý: Cho bé uống từng ngụm nước nhỏ, hoặc bổ sung pate/thức ăn ướt pha nước. Nếu bé quá yếu không chịu uống, bạn BẮT BUỘC phải đưa đi thú y để truyền dịch tĩnh mạch bù nước.',
  NOW(),
  NOW()
), (
  'chó con 1 tháng,chó 1 tháng,cún 1 tháng,chó con 1 tháng tuổi,cún 1 tháng tuổi',
  'Đối với chó con 1 tháng tuổi:\n- Số bữa ăn: Khoảng 5-6 bữa một ngày.\n- Dinh dưỡng: Nguồn dinh dưỡng chính vẫn là sữa mẹ hoặc sữa bột công thức chuyên dụng cho chó con. Bé đang trong giai đoạn tập ăn dặm (weaning), bạn có thể bắt đầu cho bé liếm cháo loãng nấu với thịt băm nhuyễn hoặc hạt ngâm nước ấm thật nát thành bột sệt.\n- LƯU Ý BẮT BUỘC: Hệ miễn dịch của bé thời gian này cực kỳ non yếu. Nếu bé đi ngoài lỏng hoặc bỏ bú/bỏ ăn trên 12 tiếng, bạn BẮT BUỘC phải mang bé đi thú y cấp cứu ngay.',
  NOW(),
  NOW()
), (
  'mèo con 1 tháng,mèo 1 tháng,mèo con 1 tháng tuổi,mèo 1 tháng tuổi',
  'Đối với mèo con 1 tháng tuổi:\n- Số bữa ăn: Khoảng 5-6 bữa một ngày.\n- Dinh dưỡng: Chủ yếu là sữa mẹ hoặc sữa công thức chuyên dùng cho mèo con. Bắt đầu giai đoạn cai sữa dặm, có thể tập cho bé liếm pate dặm (babycat) pha loãng với nước ấm hoặc cháo loãng.\n- LƯU Ý BẮT BUỘC: Nếu mèo con đi ngoài lỏng, chảy nước mũi/mắt, bỏ ăn, bạn BẮT BUỘC phải đưa đi khám thú y ngay lập tức để tránh suy nhược nhanh chóng.',
  NOW(),
  NOW()
), (
  'chó mèo sơ sinh,chó sơ sinh,mèo sơ sinh,mới đẻ',
  'Đối với chó mèo sơ sinh (dưới 1 tháng tuổi):\n- Chăm sóc: Cần giữ ấm liên tục bằng đèn sưởi hoặc túi ấm (nhiệt độ ổ khoảng 29-32 độ C). Nếu mất mẹ, phải dùng bình sữa hoặc xi-lanh đầu mềm cho bú sữa chuyên dụng ấm (khoảng 37 độ C) mỗi 2-3 tiếng/lần.\n- Vệ sinh: Dùng bông ẩm lau nhẹ vùng hậu môn/bộ phận sinh dục của bé sau khi bú để kích thích bé đi vệ sinh (giống như mẹ liếm).\n- LƯU Ý BẮT BUỘC: Nếu bé bú yếu, rên rỉ liên tục, cơ thể lạnh hoặc lờ đờ, đây là tình trạng nguy cấp, bạn BẮT BUỘC phải mang bé đến thú y ngay lập tức.',
  NOW(),
  NOW()
), (
  'ăn thức ăn gì,chế độ ăn,thực đơn',
  'Chế độ ăn phù hợp cho chó mèo:\n- Đa dạng dinh dưỡng: Thú cưng cần chế độ ăn cân đối gồm protein (thịt, cá, trứng), chất béo tốt (dầu cá), chất xơ (rau củ chín) và một ít tinh bột dễ tiêu hóa.\n- Phân loại: Nên cho ăn kết hợp thức ăn khô (hạt) để làm sạch răng và thức ăn ướt (pate, nước hầm) để cung cấp nước. Sử dụng máy PawFeed để lên lịch phân chia khẩu vị hạt khoa học.',
  NOW(),
  NOW()
), (
  'thịt bò,bò',
  'Thịt bò đối với chó mèo:\n- Giá trị dinh dưỡng: Cung cấp nguồn protein chất lượng cao, dồi dào axit amin và sắt giúp phát triển cơ bắp và tạo máu tốt.\n- Cách chế biến: Nên chọn thịt bò nạc, luộc chín hoặc xào nhẹ không dầu và hoàn toàn không nêm nếm gia vị. Không nên cho ăn thịt bò sống vì nguy cơ nhiễm khuẩn Salmonella/E. coli.\n- Tần suất: Cho ăn như bữa phụ hoặc trộn cùng hạt khô.',
  NOW(),
  NOW()
), (
  'rau củ quả,rau củ,rau,trái cây',
  'Các loại rau củ quả an toàn và độc hại cho chó mèo:\n- An toàn (phải nấu chín, cắt nhỏ): Cà rốt (tốt cho mắt), bí đỏ (hỗ trợ tiêu hóa), khoai lang (giàu chất xơ), táo (bỏ hạt).\n- Độc hại (tuyệt đối tránh): Hành tây, tỏi, hẹ (gây hủy hồng cầu), nho tươi/nho khô (gây suy thận).\n- Cách cho ăn: Chỉ nên chiếm khoảng 5-10% khẩu phần ăn hàng ngày dưới dạng xay nhuyễn trộn cùng thịt hoặc pate.',
  NOW(),
  NOW()
), (
  'hải sản,tôm,cá,mực',
  'Lưu ý khi cho chó mèo ăn hải sản:\n- Dinh dưỡng: Cá, tôm, mực cung cấp protein và omega-3 dồi dào. Tuy nhiên, một số bé nhạy cảm có thể bị dị ứng hải sản.\n- Chế biến: BẮT BUỘC phải nấu chín kỹ, lột sạch vỏ tôm, bỏ xương cá và mai mực để tránh hóc hoặc đâm rách đường tiêu hóa.\n- LƯU Ý BẮT BUỘC: Không cho ăn hải sản sống vì chứa enzyme phân hủy thiamine (vitamin B1) dẫn đến thiếu hụt vitamin thần kinh. Nếu bé nôn mửa, nổi mẩn đỏ sau khi ăn hải sản, hãy đưa đi thú y kiểm tra ngay.',
  NOW(),
  NOW()
), (
  'trứng,trứng gà,trứng cút,trứng vịt lộn',
  'Trứng đối với chó mèo:\n- Dinh dưỡng: Trứng gà, trứng cút là nguồn protein và chất béo tuyệt vời, chứa biotin giúp lông mượt da khỏe. Lòng đỏ trứng vịt lộn cũng rất bổ dưỡng cho thú cưng còi xương.\n- Cách cho ăn: Tuyệt đối chỉ cho ăn trứng đã luộc chín hoặc bác chín. Không cho ăn trứng sống vì lòng trắng trứng sống chứa avidin cản trở hấp thu biotin và có nguy cơ nhiễm khuẩn.\n- Tần suất: 1-2 quả trứng gà hoặc 3-4 quả trứng cút mỗi tuần.',
  NOW(),
  NOW()
), (
  'táo bón,khó đi ngoài,không đi ngoài được',
  'Chứng táo bón ở chó mèo:\n- Dấu hiệu: Bé rặn lâu, kêu đau khi đi vệ sinh, phân nhỏ, khô cứng như đá; bé bỏ ăn hoặc uể oải.\n- Cách xử lý nhẹ: Bổ sung thêm chất xơ (bí đỏ hấp nhuyễn), khuyến khích uống nhiều nước, cho vận động nhiều hơn.\n- LƯU Ý BẮT BUỘC: Nếu bé không đi ngoài được quá 3 ngày, rặn ra máu, nôn mửa hoặc bụng phình cứng đau đớn, đây có thể là tắc ruột hoặc phình đại tràng. Bạn BẮT BUỘC phải đưa bé đi thú y ngay lập tức để thụt tháo hoặc điều trị y tế.',
  NOW(),
  NOW()
), (
  'viêm da,nấm,ghẻ,rụng lông từng mảng',
  'Tình trạng viêm da, ghẻ nấm ở chó mèo:\n- Triệu chứng: Da nổi mẩn đỏ, rụng lông thành vệt tròn hoặc loang lổ, bé gãi liên tục, cắn da, có mùi hôi hoặc chảy dịch vàng, đóng vảy.\n- Hướng xử lý: Giữ nơi ở khô thoáng, tắm bằng sữa tắm chuyên dụng chống nấm/ghẻ theo chỉ định. Không tự ý bôi thuốc người.\n- LƯU Ý BẮT BUỘC: Nếu viêm da lan rộng, chảy máu, nhiễm trùng hoặc bé bỏ ăn, bạn BẮT BUỘC phải đưa bé đi thú y để cạo da xét nghiệm tìm nguyên nhân ký sinh trùng/nấm để điều trị đúng thuốc.',
  NOW(),
  NOW()
), (
  'rận tai,ngứa tai,vảy đen tai',
  'Bệnh rận tai (Ear Mites) ở chó mèo:\n- Triệu chứng: Bé lắc đầu liên tục, gãi tai cành cạch, tai chảy nhiều dịch màu nâu đen/vảy đen như bã cà phê và có mùi hôi hám khó chịu.\n- Xử lý: Sử dụng bông mềm và dung dịch rửa tai chuyên dụng cho thú cưng để làm sạch nhẹ nhàng tai hàng ngày. Kết hợp dùng thuốc nhỏ tai đặc trị rận tai.\n- LƯU Ý BẮT BUỘC: Nếu tai bé đỏ ửng, chảy mủ vàng hoặc chảy máu, bé nghiêng đầu đau đớn, bạn BẮT BUỘC phải đưa đi thú y để tránh biến chứng viêm tai giữa tổn thương màng nhĩ.',
  NOW(),
  NOW()
), (
  'hôi miệng,thối miệng,đánh răng,sâu răng',
  'Hôi miệng ở chó mèo:\n- Nguyên nhân: Tích tụ mảng bám, cao răng gây viêm nướu, viêm nha chu; hoặc do các bệnh về dạ dày, suy thận.\n- Cách xử lý: Tập thói quen đánh răng cho bé bằng kem đánh răng chuyên dụng (tuyệt đối không dùng kem đánh răng người vì có xylitol/floride gây ngộ độc). Cho gặm đồ chơi làm sạch răng hoặc dùng thức ăn hạt khô.\n- LƯU Ý BẮT BUỘC: Nếu nướu bé đỏ tấy, chảy máu, bé bỏ ăn vì đau miệng, chảy dãi liên tục, bạn BẮT BUỘC phải đưa đi thú y để lấy cao răng hoặc điều trị nha khoa.',
  NOW(),
  NOW()
), (
  'chó mèo bị cảm,cảm lạnh,hắt hơi,chảy mũi',
  'Bệnh cảm lạnh ở chó mèo:\n- Triệu chứng: Hắt hơi, chảy nước mũi trong, ho nhẹ, mắt ướt, hơi uể oải nhưng vẫn ăn uống được.\n- Chăm sóc: Giữ ấm cho bé, cho nằm phòng kín gió, bổ sung vitamin C hoặc gel dinh dưỡng, lau sạch dịch mũi/mắt.\n- LƯU Ý BẮT BUỘC: Nếu bé sốt cao, chảy mũi đặc màu xanh/vàng, khó thở, ho kéo dài hoặc bỏ ăn hoàn toàn, đây có thể là viêm phổi hoặc bệnh truyền nhiễm nguy hiểm. Bạn BẮT BUỘC phải đưa bé đến thú y khám ngay.',
  NOW(),
  NOW()
), (
  'dầu cá,dầu cá hồi,omega-3',
  'Lợi ích của dầu cá hồi cho chó mèo:\n- Tác dụng: Dầu cá hồi rất giàu axit béo Omega-3 (EPA và DHA) giúp nuôi dưỡng làn da khỏe mạnh, làm lông bóng mượt giảm rụng rõ rệt, hỗ trợ phát triển trí não ở chó mèo con và giảm viêm khớp ở thú cưng lớn tuổi.\n- Cách dùng: Trộn trực tiếp vài giọt dầu cá vào hạt hoặc pate hàng ngày theo liều lượng cân nặng của bé.',
  NOW(),
  NOW()
), (
  'sữa chua,probiotics',
  'Cho chó mèo ăn sữa chua:\n- Dinh dưỡng: Sữa chua chứa nhiều lợi khuẩn (probiotics) rất tốt cho đường ruột và hệ tiêu hóa của chó mèo, giúp giảm đầy hơi và tiêu chảy nhẹ. Quá trình lên men cũng làm giảm hàm lượng lactose nên an toàn hơn sữa tươi.\n- Cách chọn: Chỉ cho ăn sữa chua không đường, nguyên chất. Không ăn sữa chua có vị trái cây hoặc chứa chất ngọt xylitol.\n- Tần suất: 1-2 thìa nhỏ mỗi ngày trộn vào thức ăn.',
  NOW(),
  NOW()
), (
  'phô mai,cheese',
  'Phô mai đối với chó mèo:\n- Dinh dưỡng: Cung cấp canxi, protein và chất béo. Đây là món khoái khẩu để thưởng hoặc giấu thuốc cho bé uống.\n- Lưu ý: Chỉ nên cho ăn lượng rất nhỏ phô mai ít muối, ít béo (như Cottage cheese, phô mai lát chuyên dụng). Ăn quá nhiều phô mai có thể gây béo phì hoặc rối loạn tiêu hóa.\n- Khuyên dùng: Dùng như phần thưởng huấn luyện, không thay thế bữa ăn chính.',
  NOW(),
  NOW()
), (
  'ngộ độc,ngộ độc cấp,sùi bọt mép,co giật',
  'Ngộ độc cấp tính ở chó mèo:\n- Triệu chứng: Chảy nước dãi ròng ròng, sùi bọt mép, nôn mửa liên tục, đồng tử giãn, đi đứng loạng choạng, co giật, khó thở, hôn mê.\n- Sơ cứu: Nếu biết rõ bé vừa ăn phải chất độc gì dưới 2 giờ, liên hệ ngay thú y để hướng dẫn gây nôn khẩn cấp (như dùng oxy già loãng). Không tự ý gây nôn nếu bé đã lờ đờ hoặc hôn mê.\n- LƯU Ý BẮT BUỘC: Đây là tình huống nguy kịch đe dọa tính mạng tính bằng phút. Bạn BẮT BUỘC phải mang thú cưng cùng mẫu chất độc (nếu có) đến cơ sở thú y gần nhất ngay lập tức.',
  NOW(),
  NOW()
), (
  'tiêm dại,tiêm phòng dại,chích ngừa dại',
  'Tiêm phòng Dại cho chó mèo:\n- Tầm quan trọng: Bệnh Dại là bệnh truyền nhiễm virus nguy hiểm lây sang người và có tỷ lệ tử vong 100%. Tiêm phòng Dại là bắt buộc theo quy định pháp luật để bảo vệ thú cưng và cộng đồng.\n- Lịch tiêm: Tiêm mũi đầu tiên khi chó mèo đạt từ 3 tháng tuổi trở lên. Sau đó bắt buộc tiêm nhắc lại định kỳ mỗi năm một lần.',
  NOW(),
  NOW()
), (
  'dị ứng thức ăn,dị ứng,ngứa da',
  'Dị ứng thức ăn ở chó mèo:\n- Triệu chứng: Ngứa ngáy dai dẳng vùng tai, mặt, chân khiến bé gãi chảy máu; nôn mửa hoặc tiêu chảy mãn tính sau khi ăn một loại thực phẩm nhất định.\n- Cách xử lý: Thực hiện chế độ ăn loại trừ (Elimination Diet) bằng cách cho ăn một nguồn protein mới hoàn toàn trong 8-12 tuần dưới sự hướng dẫn của bác sĩ.\n- LƯU Ý BẮT BUỘC: Nếu dị ứng nặng gây sưng phù nề vùng mặt, khó thở cấp tính, bạn BẮT BUỘC phải đưa bé đi cấp cứu thú y ngay.',
  NOW(),
  NOW()
), (
  'luyện đi vệ sinh,đi vệ sinh đúng chỗ,dạy đi vệ sinh',
  'Hướng dẫn huấn luyện chó mèo đi vệ sinh đúng chỗ:\n1. Cố định vị trí: Đặt khay cát (cho mèo) hoặc khay tã lót (cho chó) ở nơi yên tĩnh, cố định.\n2. Quan sát thời điểm: Đưa bé đến khay vệ sinh ngay sau khi ngủ dậy, sau khi ăn uống khoảng 15-30 phút hoặc khi bé đi vòng quanh ngửi đất tìm chỗ.\n3. Khích lệ: Khen thưởng bằng giọng nói dịu dàng hoặc bánh thưởng ngay khi bé đi vệ sinh đúng chỗ.\n4. Làm sạch: Nếu bé đi bừa bãi, hãy lau sạch bằng dung dịch khử mùi enzym để xóa vết mùi, tránh bé đi lại chỗ cũ.',
  NOW(),
  NOW()
), (
  'bỏ ăn,chán ăn,không chịu ăn,ngừng ăn',
  'Khi thú cưng đột ngột bỏ ăn hoặc chán ăn:\n- Nguyên nhân phổ biến: Có thể do thay đổi loại thức ăn đột ngột, stress môi trường, thời tiết quá nóng, hoặc là dấu hiệu khởi đầu của bệnh lý.\n- Hướng xử lý: Thử kích thích vị giác của bé bằng một ít nước luộc thịt (không nêm nếm) hoặc pate ấm thơm ngon. Vệ sinh sạch sẽ bát ăn của bé.\n- LƯU Ý BẮT BUỘC: Nếu bé bỏ ăn hoàn toàn từ 24 - 48 giờ (ở mèo con là 12 - 24 giờ do nguy cơ suy gan/gan nhiễm mỡ cấp), đi kèm lờ đờ, sốt, hoặc nôn mửa tiêu chảy, bạn BẮT BUỘC phải mang bé đến phòng khám thú y ngay.',
  NOW(),
  NOW()
), (
  'uống sữa,cho uống sữa,sữa tươi,sữa bò',
  'Nguyên tắc cho chó mèo uống sữa:\n- Hội chứng không dung nạp Lactose: Đa phần chó mèo trưởng thành không thể tiêu hóa đường Lactose trong sữa bò thông thường, dễ gây đầy bụng, tiêu chảy và nôn mửa.\n- Loại sữa khuyên dùng: Tuyệt đối không cho uống sữa đặc có đường, sữa tươi có đường của người. Chỉ nên cho bé uống sữa dê nguyên chất hoặc sữa bột công thức chuyên dụng dành riêng cho chó mèo (như Bio Milk, PetLac).\n- LƯU Ý BẮT BUỘC: Nếu sau khi uống sữa bé có biểu hiện tiêu chảy kéo dài hoặc lờ đờ mất sức, hãy đưa bé đến thú y ngay.',
  NOW(),
  NOW()
), (
  'ăn xương,gặm xương,nuốt xương,mắc xương',
  'Nguy hiểm từ việc cho chó mèo gặm xương:\n- Dạng nguy hiểm: Xương đã nấu chín (đặc biệt xương gà, xương sườn heo) trở nên rất giòn, dễ bị vỡ vụn thành các mảnh nhọn sắc khi gặm, có thể đâm rách cổ họng, dạ dày hoặc làm tắc ruột thú cưng.\n- LƯU Ý BẮT BUỘC: Tuyệt đối không cho chó mèo ăn các loại xương nhỏ hoặc xương đã nấu chín. Nếu bé nuốt phải và có biểu hiện nghẹn, ho khạc liên tục, chảy nước dãi quá mức, nôn ra máu hoặc đau đớn dữ dội ở vùng bụng, bạn BẮT BUỘC phải đưa bé đi cấp cứu thú y ngay lập tức để làm thủ thuật nội soi hoặc phẫu thuật gắp xương.',
  NOW(),
  NOW()
), (
  'búi lông,khạc lông,liếm lông,hairball',
  'Tình trạng búi lông ở mèo (Hairball):\n- Nguyên nhân: Mèo tự liếm lông và nuốt phải các sợi lông chết vào dạ dày. Lâu ngày lông tích tụ lại tạo thành các búi lông lớn không tiêu hóa được.\n- Triệu chứng: Mèo thường khạc khạc, cố nôn ra cục lông, hoặc bị táo bón nhẹ.\n- Cách xử lý: Cho mèo ăn cỏ mèo (Cat Grass) hoặc sử dụng các loại gel tiêu búi lông chuyên dụng định kỳ hàng tuần giúp đẩy lông ra ngoài theo đường tiêu hóa.\n- LƯU Ý BẮT BUỘC: Nếu mèo cố khạc nôn liên tục nhưng không ra gì, bụng cứng uể oải, chán ăn lâu ngày, có thể búi lông đã gây tắc ruột hoàn toàn. Bạn BẮT BUỘC phải đưa mèo đi thú y kiểm tra gấp.',
  NOW(),
  NOW()
), (
  'béo phì,thừa cân,giảm cân,giảm béo',
  'Quản lý béo phì ở thú cưng:\n- Tác hại: Béo phì làm giảm tuổi thọ của chó mèo, tăng nguy cơ mắc bệnh tim mạch, viêm khớp, và tiểu đường.\n- Cách phòng ngừa bằng PawFeed: Sử dụng app điều chỉnh lượng ăn hàng ngày (chia nhỏ lượng calo nạp vào qua các bữa ăn tự động), hạn chế tối đa các loại bánh thưởng giàu chất béo.\n- Tư vấn: Hãy dùng Nomi để tính toán RER/DER chuẩn xác theo cân nặng mục tiêu của bé, sau đó lên lịch cho ăn chính xác.',
  NOW(),
  NOW()
), (
  'tẩy giun,sổ giun,tẩy sán',
  'Lịch tẩy giun định kỳ khuyến nghị cho chó mèo:\n- Chó/Mèo con dưới 6 tháng tuổi: Tẩy giun lần đầu khi được 2-3 tuần tuổi, sau đó cứ mỗi 2 tuần tẩy lại một lần cho đến khi được 3 tháng tuổi. Từ 3 đến 6 tháng tuổi thì định kỳ mỗi tháng tẩy 1 lần.\n- Thú cưng trên 6 tháng tuổi (và trưởng thành): Duy trì tẩy giun định kỳ 3 đến 6 tháng một lần tùy vào môi trường sống và chế độ ăn (có ăn đồ sống hay không).',
  NOW(),
  NOW()
), (
  'vắc xin,tiêm phòng,tiêm chủng,chích ngừa',
  'Lịch tiêm vắc-xin phòng bệnh cho chó mèo:\n- Chó con: Tiêm mũi đầu tiên khi bé được 6 - 8 tuần tuổi. Thực hiện lộ trình tiêm 3 mũi (mỗi mũi cách nhau 3-4 tuần) để ngừa các bệnh nguy hiểm (Care, Parvo, viêm gan,...). Sau đó tiêm phòng Dại lúc 3 tháng tuổi và nhắc lại hàng năm.\n- Mèo con: Tiêm mũi đầu tiên khi bé được 8 tuần tuổi. Thực hiện lộ trình 3 mũi phòng các bệnh (Giảm bạch cầu, viêm mũi khí quản, Calicivirus) và tiêm phòng Dại. Nhắc lại hàng năm.',
  NOW(),
  NOW()
), (
  'cát vệ sinh,khay cát,thay cát,dọn cát',
  'Vệ sinh khay cát cho mèo:\n- Tầm quan trọng: Mèo là loài động vật ưa sạch sẽ. Một khay cát bẩn có thể khiến mèo nhịn tiểu dẫn đến các bệnh về đường tiết niệu nguy hiểm hoặc đi vệ sinh bừa bãi ra nhà.\n- Khuyến nghị: Dọn phân và nước tiểu vón cục ít nhất 1-2 lần/ngày. Thay toàn bộ cát mới và rửa sạch khay bằng xà phòng nhẹ mỗi tuần một lần.',
  NOW(),
  NOW()
), (
  'chăm sóc lông,rụng lông,chải lông,tắm',
  'Bí quyết chăm sóc lông cho chó mèo khỏe mạnh:\n- Chế độ ăn uống: Bổ sung các axit béo omega-3 và omega-6 có trong dầu cá hồi hoặc thức ăn chất lượng để giúp lông bé bóng mượt, giảm rụng.\n- Chải lông: Chải lông hàng ngày giúp loại bỏ lông chết, kích thích tuần hoàn máu dưới da và hạn chế búi lông hình thành ở mèo.\n- Tắm rửa: Không nên tắm quá nhiều làm khô da (chó tắm 1-2 lần/tháng, mèo chỉ tắm khi thực sự bẩn).',
  NOW(),
  NOW()
), (
  'sốt ở chó mèo,sốt,nóng tai,nhiệt độ cao',
  'Nhận biết sốt ở thú cưng:\n- Nhiệt độ bình thường: Thân nhiệt bình thường của chó mèo nằm trong khoảng 38 - 39.2 độ C (cao hơn người).\n- Dấu hiệu sốt: Tai và đệm chân sờ thấy nóng ran, mũi khô và ấm (bình thường mũi ẩm mát), bé lờ đờ, run rẩy, chán ăn.\n- LƯU Ý BẮT BUỘC: Tuyệt đối không tự ý cho chó mèo uống thuốc hạ sốt của người (như Paracetamol gây ngộ độc máu và suy gan chết người ở mèo). Hãy BẮT BUỘC đưa bé đi thú y khám ngay.',
  NOW(),
  NOW()
), (
  'uống nước,thiếu nước,lười uống nước',
  'Cách khuyến khích chó mèo uống đủ nước:\n- Tầm quan trọng: Thiếu nước dễ dẫn đến bệnh sỏi thận, viêm đường tiết niệu, đặc biệt ở mèo.\n- Cách khuyến khích: Rửa sạch bát nước mỗi ngày và thay nước mới liên tục. Mèo rất thích nước chuyển động, bạn có thể mua vòi phun nước tuần hoàn (Pet Water Fountain). Pha thêm một ít nước ấm vào pate hoặc cho ăn thức ăn ướt thường xuyên.',
  NOW(),
  NOW()
), (
  'thức ăn hạt,hạt khô,hạt',
  'Sử dụng thức ăn hạt khô cho thú cưng:\n- Ưu điểm: Tiện lợi, dễ bảo quản, hạn chế mảng bám răng, dễ kiểm soát liều lượng ăn bằng máy PawFeed.\n- Nhược điểm: Chứa rất ít nước (chỉ khoảng 10%). Nếu cho ăn hạt hoàn toàn mà không uống đủ nước, thú cưng sẽ có nguy cơ mắc sỏi thận cao.\n- Khuyên dùng: Kết hợp cho ăn hạt khô với các bữa phụ pate hoặc bổ sung nước sạch.',
  NOW(),
  NOW()
), (
  'pate,thức ăn ướt',
  'Sử dụng pate (thức ăn ướt) cho chó mèo:\n- Ưu điểm: Hàm lượng nước cao (lên đến 70-80%), giúp bổ sung nước tự nhiên cho cơ thể, giảm nguy cơ sỏi thận, hương vị thơm ngon kích thích vị giác.\n- Cách dùng: Có thể trộn trực tiếp pate với hạt khô để tăng độ ngon miệng. Nên bảo quản pate đã mở nắp trong tủ lạnh và hâm ấm nhẹ trước khi cho ăn.',
  NOW(),
  NOW()
), (
  'tiêu hóa kém,đầy bụng,tiêu hóa chậm,khó tiêu',
  'Khi thú cưng tiêu hóa kém hoặc khó tiêu:\n- Dấu hiệu: Đầy hơi, trung tiện nhiều (đánh rắm), phân hơi mềm hoặc có mùi cực kỳ khó chịu, bụng kêu lọc ọc.\n- Hướng xử lý: Cho bé uống men vi sinh hoặc sữa chua không đường để bổ sung lợi khuẩn. Chia nhỏ các bữa ăn bằng máy PawFeed để giảm tải cho dạ dày.\n- LƯU Ý BẮT BUỘC: Nếu bé bị chướng bụng căng phồng nhanh, khó thở, cố nôn nhưng không ra gì, bạn BẮT BUỘC phải đưa đi cấp cứu thú y ngay lập tức (nguy cơ xoắn dạ dày GDV).',
  NOW(),
  NOW()
), (
  'chăm sóc răng,đánh răng,vệ sinh răng,nha chu',
  'Cách chăm sóc răng miệng phòng viêm nha chu ở chó mèo:\n- Tầm quan trọng: Mảng bám cao răng gây viêm nướu, mất răng và vi khuẩn từ miệng có thể đi vào máu làm hỏng tim, thận.\n- Cách làm: Tập đánh răng tối thiểu 2-3 lần/tuần bằng bàn chải mềm và kem đánh răng thú cưng. Cho gặm xương canxi hoặc bánh thưởng sạch răng.\n- LƯU Ý BẮT BUỘC: Không dùng kem đánh răng người. Nếu nướu bé đỏ tấy chảy máu, chảy dãi nhiều, bỏ ăn do đau miệng, bạn BẮT BUỘC phải đưa bé đi thú y khám ngay.',
  NOW(),
  NOW()
), (
  'tiêm ngừa dại,vắc xin dại,tiêm phòng dại',
  'Quy định về tiêm ngừa dại ở chó mèo:\n- Thời điểm: Mũi tiêm dại đầu tiên bắt buộc thực hiện khi bé đạt từ 12 tuần tuổi trở lên (3 tháng tuổi).\n- Chu kỳ: Phải tiêm nhắc lại hàng năm theo đúng luật thú y Việt Nam để bảo vệ sức khỏe cho thú cưng và gia đình.\n- LƯU Ý BẮT BUỘC: Nếu thú cưng cắn người hoặc bị động vật nghi dại cắn, bạn BẮT BUỘC phải đưa bé đi thú y cách ly theo dõi và người bị cắn phải đi tiêm phòng huyết thanh ngay lập tức.',
  NOW(),
  NOW()
), (
  'stress ở mèo,mèo stress,mèo sợ hãi,mèo căng thẳng',
  'Nhận biết và khắc phục stress ở mèo:\n- Triệu chứng: Mèo trốn vào góc tối, bỏ ăn, liếm lông quá mức gây rụng trụi da, đi vệ sinh bừa bãi ra ngoài khay cát, hoặc đột ngột hung dữ.\n- Nguyên nhân: Chuyển nhà mới, có người lạ hoặc thú cưng mới xuất hiện, tiếng ồn lớn (pháo hoa, sấm sét).\n- Khắc phục: Tạo không gian yên tĩnh riêng biệt, sử dụng cỏ mèo, đồ chơi catnip hoặc xịt pheromone làm dịu (như Feliway) để bé bình tĩnh lại.',
  NOW(),
  NOW()
), (
  'stress ở chó,chó stress,chó căng thẳng,chó sủa nhiều',
  'Nhận biết và khắc phục stress ở chó:\n- Triệu chứng: Chó thở hổn hển liên tục dù không nóng, sủa hoặc rên rỉ kéo dài, cắn phá đồ đạc trong nhà, đi lại bồn chồn hoặc đuôi cụp sâu giữa hai chân.\n- Khắc phục: Cho bé đi dạo giải tỏa năng lượng, chơi trò chơi cùng chủ, tạo không gian nằm yên tĩnh và an toàn.\n- Lưu ý: Sử dụng tính năng cho ăn tự động PawFeed đúng giờ để tạo cảm giác ổn định, giảm bớt lo âu xa cách (separation anxiety).',
  NOW(),
  NOW()
), (
  'triệt sản,thiến,hoạn,triệt sản chó mèo',
  'Những lưu ý khi triệt sản cho chó mèo:\n- Thời điểm tốt nhất: Nên triệt sản trước kỳ động dục đầu tiên (thường từ 6 đến 9 tháng tuổi).\n- Lợi ích: Phòng ngừa các bệnh ung thư tinh hoàn, u tử cung, viêm tử cung tích mủ (cực kỳ nguy hiểm ở thú cái) và giảm hành vi đi tiểu bậy đánh dấu lãnh thổ.\n- Chăm sóc sau phẫu thuật: Cho đeo loa chống liếm vết mổ (vòng Elizabeth), giữ vết thương khô ráo.\n- Lưu ý dinh dưỡng: Thú cưng sau triệt sản rất dễ béo phì. Cần dùng app PawFeed giảm khoảng 10-20% lượng thức ăn hàng ngày.',
  NOW(),
  NOW()
), (
  'chó mèo bị ghẻ,ghẻ chó,ghẻ mèo,ghẻ demodex,ghẻ sarcoptes',
  'Bệnh ghẻ ở chó mèo:\n- Dấu hiệu: Bé ngứa ngáy dữ dội, cào cấu liên tục đến chảy máu, rụng lông nhiều vùng đầu, tai, chân, da dày lên đóng vảy sần sùi và có mùi hôi đặc trưng.\n- LƯU Ý BẮT BUỘC: Tuyệt đối không tắm bằng nước dầu nhớt hoặc nước lá không rõ nguồn gốc vì dễ gây nhiễm trùng máu. Bạn BẮT BUỘC phải đưa bé đi thú y xét nghiệm cạo da để phân biệt ghẻ Demodex (ghẻ bao lông) và ghẻ Sarcoptes nhằm tiêm/uống thuốc đặc trị đúng phác đồ.',
  NOW(),
  NOW()
), (
  'nấm da,ghẻ nấm,lác đồng tiền,ringworm',
  'Bệnh nấm da (Ringworm) ở chó mèo:\n- Dấu hiệu: Rụng lông tạo thành các mảng hình tròn hoặc bầu dục giống đồng tiền xu, da khô bong tróc vảy trắng, bé ngứa ngáy gãi nhiều.\n- Nguy cơ lây lan: Bệnh nấm da rất dễ lây sang người gây ngứa đỏ. Cần đeo găng tay khi chăm sóc bé.\n- LƯU Ý BẮT BUỘC: Không tự ý bôi thuốc người. Hãy BẮT BUỘC đưa bé đi thú y khám để được kê đơn thuốc bôi, thuốc tắm chuyên dụng và uống thuốc kháng nấm đúng liều lượng.',
  NOW(),
  NOW()
), (
  'giun sán,giun đũa,giun móc,sán dây',
  'Tình trạng nhiễm giun sán ở thú cưng:\n- Triệu chứng: Bụng phình to tròn (nhất là ở chó mèo con), lông xơ xác, ăn nhiều nhưng không lớn, thỉnh thoảng nôn ra giun hoặc thấy đốt sán nhỏ như hạt dưa bò quanh hậu môn, bé quẹt đít xuống đất.\n- Khắc phục: Thực hiện lịch tẩy giun định kỳ. Cho ăn thức ăn chín sạch, không cho ăn thịt sống.\n- LƯU Ý BẮT BUỘC: Nếu bé nôn mửa liên tục ra giun sán, tắc ruột hoặc đi ngoài ra máu nặng, bạn BẮT BUỘC phải đưa bé đi thú y điều trị khẩn cấp.',
  NOW(),
  NOW()
), (
  'bọ chét,rận chó,rận mèo,flea',
  'Tiêu diệt bọ chét ở chó mèo:\n- Tác hại: Bọ chét hút máu gây ngứa ngáy dữ dội, viêm da dị ứng nước bọt bọ chét, truyền bệnh sán dây và gây thiếu máu ở chó mèo con.\n- Cách xử lý: Vệ sinh nơi ở sạch sẽ. Sử dụng thuốc nhỏ gáy hoặc xịt đặc trị bọ chét chuyên dụng (như Frontline, Nexgard, Revolution) định kỳ hàng tháng.\n- LƯU Ý BẮT BUỘC: Nếu bé có dấu hiệu ngộ độc thuốc trị ve rận (sùi bọt mép, run rẩy), hãy BẮT BUỘC đưa đi thú y ngay.',
  NOW(),
  NOW()
), (
  've chó,ve rận,tick',
  'Nguy hại từ ve chó và cách xử lý:\n- Dạng nguy hiểm: Ve chó hút máu truyền các bệnh ký sinh trùng đường máu nguy hiểm (Babesia, Ehrlichia) gây sốt cao, thiếu máu, suy gan thận chết người.\n- Cách xử lý: Sử dụng nhíp kẹp sát đầu ve kéo thẳng ra từ từ, tránh làm đứt đầu ve dính lại trong da gây nhiễm trùng. Nhỏ thuốc gáy chuyên dụng.\n- LƯU Ý BẮT BUỘC: Nếu chó bị ve cắn nhiều đi kèm triệu chứng sốt cao, lờ đờ, niêm mạc mắt/nướu nhợt nhạt, nước tiểu màu sẫm đỏ hoặc đen, bạn BẮT BUỘC phải mang bé đến phòng khám thú y ngay lập tức để xét nghiệm máu.',
  NOW(),
  NOW()
), (
  'viêm tai,thối tai,tai chảy mủ,viêm tai giữa',
  'Tình trạng viêm tai ở chó mèo:\n- Triệu chứng: Bé gãi tai liên tục, nghiêng đầu sang một bên, tai chảy dịch mủ vàng/xanh, tai trong đỏ rực sưng nề và bốc mùi hôi thối khó chịu.\n- Nguyên nhân: Do rận tai không điều trị, nước vào tai khi tắm, hoặc nhiễm trùng nấm/vi khuẩn.\n- LƯU Ý BẮT BUỘC: Tuyệt đối không tự ý nhỏ cồn hoặc các thuốc tự chế vào tai bé. Bạn BẮT BUỘC phải đưa đi thú y để nội soi tai, rửa sạch dịch mủ và dùng kháng sinh/thuốc nhỏ tai phù hợp.',
  NOW(),
  NOW()
), (
  'đau mắt,đỏ mắt,chảy nước mắt,đau mắt đỏ',
  'Bệnh đau mắt ở chó mèo:\n- Triệu chứng: Mắt đổ nhiều ghèn xanh/vàng, mắt đỏ ửng, bé nheo mắt hoặc nhắm tịt mắt, lấy chân dụi mắt liên tục.\n- Sơ cứu: Dùng bông gòn thấm nước muối sinh lý natri clorid 0.9% lau nhẹ nhàng rửa trôi ghèn mắt từ trong ra ngoài.\n- LƯU Ý BẮT BUỘC: Tuyệt đối không dùng thuốc nhỏ mắt của người chứa corticoid khi chưa có chỉ định (có thể gây loét, hỏng giác mạc). Hãy BẮT BUỘC đưa bé đi thú y khám ngay lập tức để tránh mù lòa.',
  NOW(),
  NOW()
), (
  'chó bị parvo,parvovirus,viêm ruột truyền nhiễm',
  'Bệnh Parvovirus cực kỳ nguy hiểm ở chó (tỷ lệ tử vong rất cao):\n- Triệu chứng: Chó bỏ ăn đột ngột, lờ đờ uể oải, nôn mửa liên tục ra dịch vàng/bọt trắng, tiêu chảy dữ dội ra nước màu hồng hoặc đỏ như máu loãng có mùi tanh hôi nồng nặc đặc trưng.\n- LƯU Ý BẮT BUỘC: Đây là bệnh truyền nhiễm virus cấp tính không có thuốc đặc trị, hủy hoại đường ruột nhanh chóng gây mất nước tử vong trong 2-3 ngày. Bạn BẮT BUỘC phải mang chó cách ly và đưa đến bệnh viện thú y điều trị truyền dịch kháng thể ngay lập tức, không tự điều trị tại nhà.',
  NOW(),
  NOW()
), (
  'chó bị care,carevirus,sài sốt chó',
  'Bệnh Care (Distemper) ở chó (bệnh truyền nhiễm tử vong cao):\n- Triệu chứng: Sốt cao thất thường, chảy dịch mũi vàng đặc, ho khan tiến triển thành ho có đờm, mắt nhiều dử ghèn bít hẹp. Giai đoạn muộn xuất hiện co giật cơ, sừng hóa đệm bàn chân và mũi.\n- LƯU Ý BẮT BUỘC: Bệnh lây lan rất nhanh qua đường hô hấp và tấn công hệ thần kinh trung ương. Bạn BẮT BUỘC phải đưa bé đến thú y điều trị cách ly hồi sức tích cực ngay lập tức khi chớm thấy các triệu chứng hô hấp kèm sốt.',
  NOW(),
  NOW()
), (
  'mèo bị giảm bạch cầu,fpv,viêm ruột truyền nhiễm mèo',
  'Bệnh giảm bạch cầu (FPV) nguy hiểm nhất ở mèo:\n- Triệu chứng: Mèo sốt cao, bỏ ăn hoàn toàn, nằm ủ rũ bên bát nước nhưng không uống, nôn mửa liên tục ra dịch mật vàng/xanh, đi ngoài lỏng mùi tanh hôi thối dữ dội, mất nước nhanh chóng làm da nhăn nheo.\n- LƯU Ý BẮT BUỘC: Bệnh phá hủy hệ miễn dịch và đường ruột của mèo cực nhanh, chết rất nhanh ở mèo con. Bạn BẮT BUỘC phải mang mèo đến phòng khám thú y để truyền dịch chống mất nước và hỗ trợ kháng thể ngay lập tức.',
  NOW(),
  NOW()
), (
  'viêm phổi,khó thở,thở gấp,chó mèo ho',
  'Bệnh viêm phổi ở chó mèo:\n- Triệu chứng: Bé ho sâu, ho kéo dài, thở khò khè khụt khịt, nhịp thở nhanh và gấp (hóp bụng để thở), niêm mạc nướu tím tái do thiếu oxy, sốt cao, bỏ ăn, mệt mỏi rệu rã.\n- LƯU Ý BẮT BUỘC: Viêm phổi tiến triển nhanh có thể gây suy hô hấp tử vong. Bạn BẮT BUỘC phải đưa bé đến thú y để thở oxy, chụp X-quang phổi và dùng kháng sinh điều trị tích cực ngay lập tức.',
  NOW(),
  NOW()
), (
  'viêm tiết niệu,bí tiểu,tiểu ra máu,tiểu buốt,sỏi thận',
  'Hội chứng viêm đường tiết niệu và sỏi thận ở chó mèo:\n- Triệu chứng: Bé đi vệ sinh nhiều lần nhưng chỉ ra vài giọt, rặn tiểu đau kêu khóc, nước tiểu có lẫn máu, hoặc mèo ngồi khay cát rất lâu nhưng không tiểu được (bí tiểu).\n- LƯU Ý BẮT BUỘC: Bí tiểu hoàn toàn quá 24h sẽ gây nhiễm độc niệu, suy thận cấp và vỡ bàng quang tử vong. Đây là trường hợp cấp cứu khẩn cấp, bạn BẮT BUỘC phải đưa thú cưng đi thú y ngay lập tức để đặt ống thông tiểu.',
  NOW(),
  NOW()
), (
  'tiểu đường,đái tháo đường,uống nhiều tiểu nhiều',
  'Bệnh tiểu đường ở chó mèo:\n- Triệu chứng: Bé ăn nhiều nhưng lại sụt cân nhanh chóng, uống nước liên tục và đi tiểu nhiều lần trong ngày (hội chứng uống nhiều tiểu nhiều), nước tiểu thu hút kiến bu.\n- Chăm sóc: Điều chỉnh chế độ ăn ít tinh bột, giàu protein và chất xơ. Thiết lập lịch ăn tự động chia nhỏ bằng máy PawFeed để duy trì ổn định đường huyết.\n- LƯU Ý BẮT BUỘC: Đưa bé đi thú y xét nghiệm máu và nước tiểu để thiết lập phác đồ tiêm insulin nếu cần thiết.',
  NOW(),
  NOW()
), (
  'suy thận,viêm thận,thận hư',
  'Bệnh suy thận ở chó mèo:\n- Triệu chứng: Uể oải, chán ăn, nôn mửa thường xuyên, hơi thở có mùi khai khai giống hóa chất amoniac, lông xơ xác rụng nhiều, uống nước và đi tiểu tăng đột biến (suy thận mãn) hoặc bí tiểu hoàn toàn (suy thận cấp).\n- LƯU Ý BẮT BUỘC: Thú cưng bị suy thận cần chế độ dinh dưỡng đặc biệt (giảm phốt-pho, đạm chất lượng cao). Hãy BẮT BUỘC đưa bé đi thú y xét nghiệm chỉ số BUN/Creatinine định kỳ và truyền dịch hỗ trợ lọc thận.',
  NOW(),
  NOW()
), (
  'cho ăn dặm,tập ăn dặm,cai sữa',
  'Cách tập cho chó mèo con ăn dặm:\n- Thời điểm: Bắt đầu khi bé được khoảng 3 - 4 tuần tuổi.\n- Thực đơn dặm: Pha sữa bột chuyên dụng cho thú cưng ấm trộn với một ít pate hoặc hạt khô dặm nghiền nát thành hỗn hợp sệt như cháo loãng. Cho bé liếm từ ít đến nhiều.\n- Tần suất: 3-4 bữa nhỏ mỗi ngày song song với việc bú mẹ. Giảm dần cữ bú để bé cai sữa hoàn toàn lúc 2 tháng tuổi.',
  NOW(),
  NOW()
), (
  'pate tự làm,pate homemade,nấu pate',
  'Hướng dẫn nấu pate tự làm an toàn cho chó mèo tại nhà:\n- Nguyên liệu an toàn: Thịt ức gà, thịt heo nạc, cá thu/cá hồi lọc sạch xương, gan gà/heo (lượng vừa phải), bí đỏ, cà rốt.\n- Cách chế biến: Luộc chín tất cả nguyên liệu, xay thật nhuyễn mịn, có thể cho thêm nước luộc thịt để tạo độ ẩm sệt. Cấp đông bảo quản.\n- CẢNH BÁO QUAN TRỌNG: Tuyệt đối KHÔNG nêm gia vị (muối, đường, hạt nêm, nước mắm, hành, tỏi) vì sẽ gây suy thận và ngộ độc máu hủy hoại thú cưng.',
  NOW(),
  NOW()
), (
  'đồ ăn sống,raw food,barf,cho ăn thịt sống',
  'Chế độ ăn thịt sống (Raw Feeding / BARF) cho chó mèo:\n- Ưu điểm: Lông bóng mượt, phân ít mùi hơn.\n- Nguy cơ: Rất dễ nhiễm khuẩn có hại (Salmonella, E. coli, Listeria) gây ngộ độc tiêu chảy cấp; nguy cơ hóc xương sống sắc nhọn; mất cân bằng dinh dưỡng nếu tự phối trộn sai tỷ lệ.\n- LƯU Ý BẮT BUỘC: Nếu quyết định cho ăn sống, bạn phải chọn nguồn thịt cực kỳ sạch, được cấp đông sâu ít nhất 3 ngày trước khi dùng. Nếu bé nôn mửa, sốt hoặc tiêu chảy sau khi ăn thịt sống, hãy đưa đi thú y gấp.',
  NOW(),
  NOW()
), (
  'chế độ ăn kiêng,giảm béo chó mèo,khẩu phần giảm cân',
  'Thiết lập chế độ ăn kiêng giảm cân cho thú cưng béo phì:\n- Cách làm: Tính toán năng lượng tiêu chuẩn (DER) dựa trên cân nặng mục tiêu (không tính theo cân nặng béo phì hiện tại). Giảm khoảng 10-20% lượng thức ăn.\n- Lên lịch bằng PawFeed: Chia nhỏ khẩu phần thành 4-5 bữa nhỏ mỗi ngày giúp bé không bị đói và duy trì năng lượng ổn định. Chọn loại hạt chuyên dụng hỗ trợ kiểm soát cân nặng (giàu xơ, ít béo).',
  NOW(),
  NOW()
), (
  'thời gian cho ăn tự động,lịch ăn tự động,cấu hình giờ ăn',
  'Cài đặt thời gian cho ăn tự động trên ứng dụng PawFeed:\n- Khuyến nghị: Thiết lập tối thiểu 2-3 bữa ăn cố định mỗi ngày cho thú cưng trưởng thành và 4-5 bữa cho thú cưng con.\n- Lợi ích: Giúp duy trì dịch vị dạ dày ổn định, hạn chế thói quen đòi ăn phá phách vào ban đêm và đảm bảo bé luôn được cho ăn đúng giờ dù bạn bận rộn hay vắng nhà.',
  NOW(),
  NOW()
), (
  'máy nước tự động,đài phun nước,máy lọc nước,uống nước tự động',
  'Sử dụng đài phun nước hoặc máy lọc nước tự động cho chó mèo:\n- Ưu điểm: Nước chuyển động liên tục thu hút bản năng tò mò của thú cưng, giúp chúng uống nhiều nước hơn tới 50-80%, ngăn ngừa bệnh sỏi thận và suy thận mãn tính.\n- Vệ sinh: Cần thay bộ lọc carbon/bông lọc mỗi 2-4 tuần một lần và rửa sạch máy lọc nước mỗi tuần để tránh rêu mốc, vi khuẩn tích tụ gây tiêu chảy cho thú cưng.',
  NOW(),
  NOW()
), (
  'ức gà,thịt gà,cho ăn ức gà,gà luộc',
  'Ức gà đối với chó mèo:\n- Dinh dưỡng: Nguồn protein nạc cực kỳ lý tưởng, ít béo, dễ tiêu hóa, rất thích hợp cho thú cưng giảm cân, mèo con tập ăn dặm hoặc thú cưng đang hồi phục sau bệnh tiêu hóa.\n- Chế độ chế biến: Luộc chín hoặc hấp chín hoàn toàn, tuyệt đối không nêm nếm gia vị (muối, hạt nêm). Xé nhỏ hoặc xay nhuyễn tùy theo kích cỡ của bé để tránh bị hóc.',
  NOW(),
  NOW()
), (
  'thịt heo,thịt lợn,cho ăn thịt heo',
  'Thịt heo (thịt lợn) cho chó mèo:\n- Dinh dưỡng: Cung cấp đạm, vitamin nhóm B (B1, B6, B12) và sắt tốt. Tuy nhiên, thịt heo thường chứa nhiều chất béo hơn ức gà hay thịt bò.\n- Lưu ý: Chỉ cho ăn phần thịt nạc heo, bỏ hết mỡ thừa để phòng ngừa bệnh viêm tụy cấp tính ở chó mèo do dung nạp quá nhiều chất béo. BẮT BUỘC phải nấu chín kỹ để tiêu diệt các ký sinh trùng nguy hiểm như sán dây, giun xoắn.',
  NOW(),
  NOW()
), (
  'hạt khô cho người,cho ăn hạt điều,hạt sen,óc chó,mắc ca,đậu phộng',
  'Lưu ý khi cho chó mèo ăn các loại hạt của người:\n- Hạt sen: An toàn nếu được luộc chín mềm và bỏ tim sen (tim sen có vị đắng và chứa chất gây buồn ngủ).\n- Hạt mắc ca (Macadamia): CỰC KỲ ĐỘC đối với chó, gây yếu cơ, liệt chi sau, nôn mửa, sốt và run rẩy.\n- Các loại hạt khác (óc chó, hạnh nhân, đậu phộng): Chứa lượng chất béo quá cao, dễ gây đầy bụng, viêm tụy cấp và có nguy cơ gây nghẹn hóc đường thở.\n- LƯU Ý BẮT BUỘC: Nếu phát hiện thú cưng lỡ nuốt phải lượng lớn hạt mắc ca hoặc bị nghẹn hóc, chảy dãi tím tái, bạn BẮT BUỘC phải đưa bé đi thú y cấp cứu ngay.',
  NOW(),
  NOW()
), (
  'mèo già,mèo lớn tuổi,mèo cao tuổi,senoir cat',
  'Dinh dưỡng và chăm sóc mèo lớn tuổi (trên 7-10 tuổi):\n- Nhu cầu năng lượng: Mèo già thường giảm hấp thụ chất dinh dưỡng và có xu hướng gầy đi, hoặc ngược lại bị béo phì do lười vận động. Cần chọn hạt chuyên dụng cho mèo lớn tuổi dễ tiêu hóa và giàu chất chống oxy hóa.\n- Chăm sóc khớp và thận: Bổ sung glucosamine/chondroitin cho khớp và giữ lượng phốt pho ở mức thấp để bảo vệ thận.\n- Lịch ăn: Chia nhỏ thành 3-4 bữa nhỏ qua máy PawFeed để giảm tải cho dạ dày.',
  NOW(),
  NOW()
), (
  'chó già,chó lớn tuổi,chó cao tuổi,senior dog',
  'Dinh dưỡng và chăm sóc chó lớn tuổi (trên 7-9 tuổi tùy giống):\n- Thay đổi thể trạng: Chó già dễ bị viêm khớp, suy giảm trí nhớ, rụng răng và giảm hoạt động. Nên cho ăn hạt mềm hơn (hoặc ngâm hạt khô với nước ấm trước khi ăn).\n- Dinh dưỡng: Giảm calo trong khẩu phần để tránh béo phì nhưng vẫn phải đảm bảo đạm chất lượng cao để duy trì cơ bắp. Bổ sung omega-3 bảo vệ tim mạch và khớp.\n- Thiết lập máy PawFeed: Chia nhỏ bữa ăn để tránh đầy bụng, đầy hơi chướng bụng (GDV).',
  NOW(),
  NOW()
), (
  'mèo mang thai,mèo bầu,mèo đẻ,mèo có thai',
  'Dinh dưỡng cho mèo mang thai (bầu khoảng 9 tuần):\n- Tăng lượng calo: Khác với chó, mèo mẹ mang thai cần tăng dần lượng thức ăn ngay từ đầu thai kỳ. Đến lúc sinh, lượng ăn có thể tăng gấp 1.5 lần bình thường.\n- Chọn thức ăn: Chuyển sang cho ăn hạt dành riêng cho mèo con (kitten food) hoặc pate dinh dưỡng cao vì chứa nhiều protein, canxi và chất béo hơn hạt mèo trưởng thành.\n- Lên lịch tự động: Chia nhỏ khẩu phần thành 4-6 bữa bằng máy PawFeed để mèo bầu không bị chèn ép dạ dày khi thai nhi lớn lên.\n- LƯU Ý BẮT BUỘC: Nếu mèo bầu bị sốt, bỏ ăn hoàn toàn trên 24 giờ, mệt mỏi ủ rũ hoặc rỉ dịch âm đạo bất thường, bạn BẮT BUỘC phải đưa bé đi thú y kiểm tra ngay để tránh nguy cơ sảy thai hoặc lưu thai nguy hiểm.',
  NOW(),
  NOW()
), (
  'chó mang thai,chó bầu,chó đẻ,chó có thai',
  'Dinh dưỡng cho chó mang thai (bầu khoảng 9 tuần):\n- Giai đoạn 1-5 tuần đầu: Duy trì lượng thức ăn bình thường. Cho ăn quá nhiều giai đoạn này dễ gây tích mỡ cản trước sinh nở.\n- Giai đoạn 6-9 tuần cuối: Thai nhi phát triển nhanh chóng và chèn ép dạ dày. Hãy chuyển sang hạt cho chó con (puppy food) giàu đạm và canxi. Chia nhỏ khẩu phần ăn thành 4-5 bữa nhỏ mỗi ngày qua app PawFeed.\n- LƯU Ý BẮT BUỘC: Không tự ý bổ sung quá liều canxi dạng thuốc khi chó mang thai vì dễ gây hội chứng sốt sữa (hạ canxi huyết) sau sinh. Nếu chó bầu bỏ ăn liên tục trên 24 giờ, mệt mỏi rệu rã hoặc chảy dịch âm đạo bất thường, bạn BẮT BUỘC phải đưa đi thú y khám ngay.',
  NOW(),
  NOW()
), (
  'mèo nuôi con,mèo mẹ cho con bú,mèo mẹ đẻ',
  'Dinh dưỡng cho mèo mẹ đang nuôi con bằng sữa mẹ:\n- Cho ăn không giới hạn (Ad Libitum): Giai đoạn cho con bú tiêu tốn cực kỳ nhiều năng lượng của mèo mẹ. Hãy để sẵn hạt khô trong khay hoặc thiết lập máy PawFeed cho ăn nhiều bữa lớn với lượng calo cao gấp 2-3 lần bình thường.\n- Nước sạch và sữa: Luôn đảm bảo đĩa nước sạch đầy ắp vì cơ thể cần nước để sản xuất sữa. Có thể bổ sung sữa dê ấm chuyên dụng.\n- Dấu hiệu nguy hiểm: Nếu mèo mẹ thở dốc, run rẩy tay chân, sùi bọt mép, đây là dấu hiệu hạ canxi huyết cấp. Bạn BẮT BUỘC phải đưa bé đi cấp cứu thú y ngay.',
  NOW(),
  NOW()
), (
  'chó nuôi con,chó mẹ cho con bú,chó mẹ đẻ',
  'Dinh dưỡng cho chó mẹ đang nuôi cún con:\n- Lượng calo nạp vào: Cần tăng từ 2 đến 4 lần so với mức bình thường tùy thuộc vào số lượng cún con. Sử dụng hạt dành cho chó con (puppy food) chất lượng cao.\n- Thiết lập máy PawFeed: Tăng tối đa số bữa ăn tự động trong ngày (4-6 bữa) và tăng lượng thức ăn mỗi bữa.\n- LƯU Ý BẮT BUỘC: Sốt sữa do hạ canxi huyết cấp (eclampsia) cực kỳ phổ biến ở chó mẹ nuôi con từ tuần thứ 2 đến tuần thứ 4 sau sinh. Nếu thấy chó mẹ đi đứng loạng choạng, cứng cơ, thở gấp, run rẩy co giật hoặc bỏ con, bạn BẮT BUỘC phải đưa đi thú y cấp cứu truyền canxi tĩnh mạch ngay lập tức để tránh tử vong.',
  NOW(),
  NOW()
), (
  'mất điện,máy feeder cúp điện,sao lưu pin,pin dự phòng máy cho ăn',
  'Xử lý tình huống mất điện đối với máy cho ăn tự động PawFeed:\n- Pin dự phòng: Máy PawFeed được thiết kế khe cắm pin dự phòng (dùng 4 viên pin kiềm D-cell hoặc cổng nguồn dự phòng tùy model) ở đáy thiết bị. Khi mất điện lưới, máy sẽ tự động chuyển sang chế độ nguồn pin dự phòng.\n- Tính năng lưu lịch trình offline: Toàn bộ lịch trình cho ăn đã thiết lập sẽ được lưu trực tiếp trên bộ nhớ máy. Ngay cả khi mất điện và mất kết nối Wifi, máy vẫn sẽ chạy đúng giờ theo lịch trình ngoại tuyến nhờ nguồn pin dự phòng này.',
  NOW(),
  NOW()
), (
  'lỗi wifi,máy offline,máy cho ăn ngoại tuyến,không kết nối được',
  'Cách khắc phục khi máy cho ăn tự động PawFeed báo ngoại tuyến (Offline) hoặc mất kết nối Wifi:\n1. Kiểm tra nguồn điện: Đảm bảo đèn nguồn trên thiết bị vẫn sáng ổn định.\n2. Kiểm tra router mạng: Đảm bảo mạng Wifi nhà bạn hoạt động bình thường, băng tần sử dụng phải là 2.4GHz (thiết bị không hỗ trợ băng tần 5GHz).\n3. Khoảng cách: Đặt máy cho ăn gần router Wifi trong bán kính 5 mét không có vật cản dày.\n4. Reset và kết nối lại: Nhấn giữ nút Wi-Fi trên máy trong 5 giây cho đến khi đèn báo nhấp nháy nhanh, mở app PawFeed và chọn "Thêm thiết bị" để thiết lập lại kết nối.',
  NOW(),
  NOW()
), (
  'vệ sinh máy cho ăn,rửa khay ăn,vệ sinh khay hạt,rửa thùng hạt',
  'Quy trình vệ sinh máy cho ăn tự động PawFeed định kỳ (khuyến nghị 2 tuần/lần):\n1. Rút phích cắm điện và tháo hết pin dự phòng để đảm bảo an toàn điện.\n2. Lấy toàn bộ hạt còn dư ra khỏi thùng chứa hạt.\n3. Tháo rời khay ăn inox/nhựa và thùng chứa hạt ra khỏi thân máy.\n4. Rửa sạch thùng hạt và khay ăn bằng xà phòng nhẹ và nước ấm. KHÔNG để nước dính vào phần thân máy chính (nơi chứa động cơ và bo mạch điện tử).\n5. Lau khô hoàn toàn 100% tất cả các bộ phận trước khi lắp ráp lại để tránh làm hạt ẩm mốc và chập cháy linh kiện điện tử.',
  NOW(),
  NOW()
), (
  'kẹt hạt,kẹt thức ăn,máy không ra hạt,lỗi kẹt hạt',
  'Cách xử lý khi máy cho ăn PawFeed báo lỗi kẹt hạt hoặc không ra thức ăn:\n- Nguyên nhân: Kích thước hạt quá lớn, hạt bị ẩm dính lại thành khối, hoặc có dị vật rơi vào buồng chia hạt.\n- Hướng xử lý tại nhà:\n1. Tháo thùng chứa hạt ra và đổ hết hạt bên trong ra ngoài.\n2. Kiểm tra buồng xoay silicone ở đáy thùng xem có bị kẹt dị vật hay mảnh vụn hạt lớn nào không và làm sạch.\n3. Thay gói hút ẩm mới dưới nắp máy để hút sạch ẩm mốc làm mềm hạt.\n4. Chọn loại hạt có đường kính phù hợp (từ 2 đến 12mm).\n- LƯU Ý BẮT BUỘC: Không dùng tay hoặc que sắc chọc mạnh vào khe nhả hạt khi máy đang chạy vì có thể làm hỏng cảm biến tiệm cận hoặc động cơ xoay.',
  NOW(),
  NOW()
), (
  'kích thước hạt,loại hạt máy cho ăn,kích thước thức ăn hạt',
  'Lựa chọn kích thước thức ăn hạt khô phù hợp cho máy PawFeed:\n- Kích thước tiêu chuẩn: Máy PawFeed hỗ trợ hầu hết các loại hạt khô cho chó mèo có dạng hình tròn, hình tam giác hoặc hình chữ thập có đường kính từ 2mm đến tối đa 12mm.\n- Loại hạt cấm dùng: Tuyệt đối KHÔNG sử dụng hạt sấy đông khô (freeze-dried) có kích cỡ quá lớn, hạt dạng dẹt dài, hạt ẩm ướt hoặc các loại hạt tự làm không đều kích thước vì dễ gây kẹt động cơ xoay và làm sai lệch trọng lượng lượng ăn được thiết lập.',
  NOW(),
  NOW()
), (
  'ẩm mốc hạt,gói hút ẩm,bảo quản hạt,thức ăn bị ẩm',
  'Cách bảo quản hạt thức ăn trong máy PawFeed tránh ẩm mốc và côn trùng:\n- Gói hút ẩm chuyên dụng: Đặt gói hút ẩm (silica gel) chuyên dùng dưới nắp đậy của thùng chứa hạt PawFeed. Khuyến nghị nên thay gói hút ẩm mới mỗi 30 ngày một lần để đảm bảo hiệu quả chống ẩm.\n- Đậy kín nắp: Luôn đảm bảo nắp thùng hạt được khóa chặt và đệm gioăng cao su silicone quanh nắp không bị rách, giúp ngăn chặn kiến, gián bò vào và giữ hạt luôn giòn thơm.\n- Không để nơi ẩm ướt: Đặt máy cho ăn ở vị trí khô ráo, tránh ánh nắng trực tiếp và nơi có độ ẩm cao như nhà tắm hay ngoài ban công.',
  NOW(),
  NOW()
), (
  'báo hết hạt,cảm biến hạt,hết thức ăn,hết hạt',
  'Tính năng cảnh báo hết hạt và cảm biến thông minh của PawFeed:\n- Cảm biến hồng ngoại: Máy được trang bị cảm biến hồng ngoại tiệm cận ở buồng chứa hạt. Khi lượng hạt xuống dưới mức tối thiểu (khoảng 10-15% dung tích thùng), máy sẽ phát tiếng bíp và gửi thông báo đẩy "Hết hạt thức ăn" về điện thoại của bạn ngay lập tức.\n- Cảm biến đầu ra: Nếu khay ăn của bé đã quá đầy thức ăn chưa ăn hết, cảm biến đầu ra sẽ tự động tạm ngưng lần cho ăn tiếp theo để tránh tràn hạt ra sàn.',
  NOW(),
  NOW()
), (
  'mèo bị nấc cụt,mèo nấc,hiccup mèo',
  'Hiện tượng nấc cụt ở mèo (đặc biệt là mèo con):\n- Nguyên nhân: Do mèo ăn quá nhanh nuốt nhiều không khí, do chạy nhảy mạnh ngay sau khi ăn, hoặc do thay đổi nhiệt độ đột ngột làm cơ hoành bị kích thích co thắt.\n- Cách xử lý tại nhà: Xoa nhẹ vùng ngực và bụng của mèo để giúp bé thư giãn, vuốt ve lưng, hoặc dụ bé uống một chút nước ấm sạch.\n- LƯU Ý BẮT BUỘC: Nấc cụt thông thường chỉ kéo dài từ vài phút đến tối đa 1 tiếng. Nếu mèo nấc cụt liên tục kéo dài nhiều ngày, đi kèm biểu hiện khó thở, thở khò khè, ho khan hoặc nôn mửa dịch vàng dịch xanh, bạn BẮT BUỘC phải đưa bé đi khám thú y vì đây có thể là dấu hiệu của bệnh tim, viêm phổi hoặc giun tim nguy hiểm.',
  NOW(),
  NOW()
), (
  'chó bị nấc cụt,chó nấc,hiccup chó',
  'Hiện tượng nấc cụt ở chó (rất phổ biến ở cún con):\n- Nguyên nhân: Cún con ăn uống quá vội vàng nuốt nhiều khí, đùa nghịch quá khích, bị lạnh bụng hoặc stress tâm lý đột ngột.\n- Xử lý tại nhà: Cho cún uống một chút nước ấm, cho ăn một thìa mật ong hoặc sữa chua để làm dịu cơ hoành, dắt cún đi bộ nhẹ nhàng để điều hòa lại nhịp thở.\n- LƯU Ý BẮT BUỘC: Nếu chó nấc cụt dữ dội kéo dài nhiều giờ không dứt, kèm theo nôn ói dịch, bụng phình to căng cứng hoặc thở rên rỉ đau đớn, bạn BẮT BUỘC phải đưa bé đi thú y ngay lập tức để cấp cứu tắc ruột hoặc chướng bụng xoắn dạ dày.',
  NOW(),
  NOW()
), (
  'chăm sóc sau triệt sản,chăm sóc vết mổ triệt sản,rửa vết mổ triệt sản',
  'Hướng dẫn chăm sóc vết mổ cho chó mèo sau khi triệt sản:\n1. Đeo loa chống liếm (vòng cổ Elizabeth): BẮT BUỘC phải đeo loa liên tục trong 7-10 ngày cho đến khi cắt chỉ hoặc vết thương lành hẳn để tránh bé tự liếm, cắn rách chỉ mổ gây nhiễm trùng.\n2. Vệ sinh vết thương: Dùng tăm bông thấm dung dịch sát khuẩn (như Betadine loãng hoặc nước muối sinh lý) lau nhẹ quanh vết mổ mỗi ngày 1 lần. Tuyệt đối không tắm rửa làm ướt vết thương.\n3. Hạn chế vận động: Nhốt bé trong chuồng hoặc phòng hẹp, tránh chạy nhảy, leo trèo cầu thang làm bục vết khâu.\n- LƯU Ý BẮT BUỘC: Nếu vết mổ sưng tấy đỏ, chảy mủ, rỉ máu không ngừng hoặc bé sốt lờ đờ bỏ ăn hoàn toàn, bạn BẮT BUỘC phải đưa bé đến thú y tái khám khẩn cấp.',
  NOW(),
  NOW()
), (
  'say nắng,sốc nhiệt,quá nóng,chó mèo bị nóng,heatstroke',
  'Say nắng và sốc nhiệt ở chó mèo (cực kỳ nguy hiểm vào mùa hè):\n- Triệu chứng: Thú cưng thở dốc, lè lưỡi thở hổn hển dữ dội, chảy nước dãi đặc, niêm mạc miệng đỏ sẫm hoặc tím tái, sốt cao (trên 40 độ C), đi đứng loạng choạng, nôn mửa, co giật và ngất xỉu.\n- Sơ cứu khẩn cấp: Đưa bé vào bóng râm mát, bật quạt. Dùng khăn ướt mát (KHÔNG dùng nước đá lạnh buốt gây co mạch đột ngột) lau khắp người, đệm chân và gáy để hạ nhiệt từ từ. Cho uống từng chút nước mát.\n- LƯU Ý BẮT BUỘC: Đây là tình trạng cấp cứu khẩn cấp có thể gây suy đa tạng tử vong rất nhanh. Sau khi sơ cứu hạ nhiệt xuống dưới 39.5 độ C, bạn BẮT BUỘC phải đưa bé đến thú y ngay lập tức.',
  NOW(),
  NOW()
), (
  'ong đốt,ong chích,côn trùng cắn,rắn cắn',
  'Xử lý khi chó mèo bị ong đốt hoặc côn trùng cắn:\n- Triệu chứng: Vùng bị đốt (thường là mặt, mũi, chân) sưng húp tấy đỏ, bé đau đớn kêu rên, lấy chân gãi liên tục.\n- Sơ cứu: Tìm và dùng nhíp gắp ngòi độc ra ngoài nhẹ nhàng (tránh bóp mạnh túi độc làm chất độc bơm thêm vào da). Chườm đá lạnh lên vết sưng để giảm đau và giảm phù nề.\n- LƯU Ý BẮT BUỘC: Nếu bé bị dị ứng nặng (phản vệ) dẫn đến sưng phù nề toàn bộ mặt và cổ họng gây tắc nghẽn đường thở, khó thở khò khè, nôn mửa, đi ngoài lỏng hoặc suy kiệt loạng choạng, bạn BẮT BUỘC phải đưa bé đi thú y cấp cứu tiêm thuốc kháng histamine/corticoid ngay lập tức.',
  NOW(),
  NOW()
), (
  'rụng lông sinh lý,thay lông,rụng lông nhiều',
  'Phân biệt rụng lông sinh lý (thay lông) và rụng lông bệnh lý ở chó mèo:\n- Thay lông sinh lý: Diễn ra định kỳ (thường vào mùa xuân và mùa thu). Lông rụng đều toàn thân, dưới lớp lông rụng vẫn có lớp lông mới mọc lên mềm mượt, da bé hoàn toàn khỏe mạnh, không đỏ, không đóng vảy, bé không bị ngứa ngáy gãi cào.\n- Rụng lông bệnh lý: Lông rụng thành từng mảng loang lổ lộ rõ da, da nổi mẩn đỏ, bong tróc vảy trắng hoặc rỉ dịch, bé liên tục ngứa ngáy gãi cắn vùng da rụng lông (dấu hiệu của nấm, ghẻ, ký sinh trùng).\n- Khuyên dùng: Chải lông hàng ngày và bổ sung Omega-3 từ dầu cá hồi để hạn chế rụng lông sinh lý.',
  NOW(),
  NOW()
), (
  'sụt cân nhanh,gầy đi,sút cân,gầy gò',
  'Khi chó mèo bị sụt cân nhanh chóng không rõ nguyên nhân:\n- Nguyên nhân tiềm ẩn: Có thể do nhiễm ký sinh trùng đường ruột nặng (giun sán), bệnh suy thận, tiểu đường, cường giáp (phổ biến ở mèo già), các bệnh lý về gan, tim mạch hoặc các khối u ác tính.\n- LƯU Ý BẮT BUỘC: Sụt cân đột ngột mất kiểm soát (giảm trên 10% trọng lượng cơ thể trong thời gian ngắn) là biểu hiện bệnh lý nghiêm trọng bên trong. Bạn BẮT BUỘC phải mang thú cưng đi thú y để xét nghiệm máu, siêu âm và xét nghiệm phân tìm nguyên nhân gốc rễ để điều trị.',
  NOW(),
  NOW()
), (
  'cắt móng,cắt móng chó mèo,hướng dẫn cắt móng,bấm móng',
  'Hướng dẫn cắt móng cho chó mèo an toàn tại nhà:\n1. Chuẩn bị kìm bấm móng chuyên dụng cho thú cưng và bột cầm máu (hoặc bột bắp).\n2. Cố định bé nhẹ nhàng, dùng ngón tay ấn nhẹ vào đệm chân để móng lộ ra ngoài.\n3. Xác định phần tủy móng (phần màu hồng chứa mạch máu và dây thần kinh). Chỉ bấm phần móng sừng màu trắng đục nằm trước phần tủy từ 2-3mm. Tuyệt đối không cắt phạm vào phần màu hồng sẽ gây chảy máu và đau đớn dữ dội cho bé.\n4. Cầm máu: Nếu lỡ cắt phạm gây chảy máu, hãy ấn ngay bột cầm máu hoặc bột bắp vào đầu móng giữ chặt trong 1 phút để cầm máu.',
  NOW(),
  NOW()
), (
  'tuyến hôi,vắt tuyến hôi,tuyến hậu môn,hôi mông',
  'Vệ sinh tuyến hôi (tuyến hậu môn) ở chó mèo:\n- Tầm quan trọng: Tuyến hôi nằm ở vị trí 4 giờ và 8 giờ xung quanh hậu môn, tiết ra dịch có mùi đặc trưng để đánh dấu lãnh thổ. Bình thường dịch tự thoát ra khi đi vệ sinh. Nếu tuyến bị tắc, dịch tích tụ gây hôi thối, viêm nhiễm sưng tấy đau đớn.\n- Cách vắt (khuyến nghị thực hiện khi tắm):\n1. Nâng đuôi bé lên.\n2. Dùng ngón cái và ngón trỏ ép nhẹ nhàng từ dưới lên và hướng vào trong tại góc 4h và 8h.\n3. Dịch hôi sẽ bắn ra, rửa sạch ngay bằng xà phòng tắm.\n- LƯU Ý BẮT BUỘC: Nếu vùng hậu môn sưng đỏ mọng nước, chảy mủ hoặc rỉ máu, bé quẹt đít kêu đau đớn liên tục, tuyến hôi có thể đã bị áp-xe. Bạn BẮT BUỘC phải đưa bé đi thú y rửa và điều trị y tế ngay.',
  NOW(),
  NOW()
), (
  'cỏ mèo,cỏ lúa mì,cho ăn cỏ mèo,cat grass',
  'Lợi ích và cách cho ăn cỏ lúa mì (cỏ mèo):\n- Lợi ích: Cỏ lúa mì cung cấp nhiều chất xơ, vitamin (A, B, C, E) và khoáng chất cần thiết. Sợi cỏ giúp làm sạch dạ dày, kích thích mèo khạc nôn các búi lông tích tụ ra ngoài, hỗ trợ tiêu hóa tốt.\n- Hướng dẫn dùng: Gieo hạt lúa mì sạch trong chậu đất nhỏ. Khi cỏ cao khoảng 7-10cm, bạn có thể để chậu cỏ cho mèo tự gặm hoặc cắt nhỏ trộn vào pate, hạt khô cho bé ăn.',
  NOW(),
  NOW()
), (
  'chó mèo ăn cỏ,thú cưng gặm cỏ,ăn cỏ ngoài đường',
  'Tại sao chó mèo thích ăn cỏ dại ngoài đường:\n- Hỗ trợ tiêu hóa: Đây là bản năng tự nhiên giúp làm sạch đường ruột. Khi dạ dày đầy hơi, khó tiêu hoặc có búi lông, thú cưng ăn cỏ dại để kích thích phản ứng nôn, tống khứ chất bã thức ăn thừa hoặc dị vật ra ngoài.\n- Thiếu chất: Một số bé ăn cỏ để bổ sung chất xơ và vitamin nhóm B bị thiếu hụt.\n- CẢNH BÁO AN TOÀN: Tuyệt đối tránh cho thú cưng ăn cỏ ven đường công cộng vì có nguy cơ cao bị ngộ độc thuốc trừ sâu, thuốc diệt cỏ hoặc nhiễm ấu trùng giun sán từ chất thải động vật khác.',
  NOW(),
  NOW()
), (
  'ăn phân,chó ăn phân,chó ăn cứt,coprophagia',
  'Chứng ăn phân (Coprophagia) ở chó mèo:\n- Nguyên nhân phổ biến: Do cơ thể thiếu hụt enzyme tiêu hóa, thiếu chất dinh dưỡng (sắt, vitamin B); do đói quá mức do thiết lập lượng ăn quá ít; hoặc do stress tâm lý, tò mò ở chó con.\n- Cách khắc phục:\n1. Vệ sinh ngay lập tức: Dọn sạch phân của bé ngay sau khi đi vệ sinh.\n2. Điều chỉnh dinh dưỡng: Bổ sung men tiêu hóa và khoáng chất. Sử dụng máy PawFeed để cài đặt giờ ăn đều đặn chia nhỏ bữa, tránh để bé quá đói.\n3. Sử dụng chất ngăn chặn: Trộn một ít bí đỏ hoặc chất tạo mùi khó chịu cho phân vào thức ăn của bé để làm phân có mùi bé ghét.',
  NOW(),
  NOW()
), (
  'lo âu xa cách,trầm cảm chó mèo,buồn bã,cắn phá đồ đạc',
  'Hội chứng lo âu xa cách (Separation Anxiety) ở thú cưng:\n- Triệu chứng: Chó mèo sủa rên rỉ liên tục, cắn phá cửa, cào đồ đạc nát bét khi chủ vắng nhà, đi vệ sinh bừa bãi hoặc liếm lông tự hại.\n- Cách khắc phục:\n1. Huấn luyện làm quen: Rời nhà từ vài phút rồi tăng dần thời gian.\n2. Đồ chơi giải trí: Để lại đồ chơi nhồi thức ăn (như đồ chơi Kong).\n3. Cố định giờ ăn: Sử dụng máy cho ăn tự động PawFeed để bé luôn được ăn đúng giờ, tạo cảm giác an tâm và ổn định nhịp sinh học dù không có chủ ở nhà.',
  NOW(),
  NOW()
), (
  'làm quen mèo mới,giới thiệu mèo mới,hai con mèo đánh nhau',
  'Quy trình giới thiệu làm quen mèo mới và mèo cũ tránh xung đột:\n1. Cách ly ban đầu: Nhốt mèo mới ở một phòng riêng biệt có đầy đủ khay cát, đĩa ăn trong 3-7 ngày đầu. KHÔNG cho hai bé nhìn thấy nhau trực tiếp.\n2. Trao đổi mùi hương: Dùng khăn lau người bé này rồi lau cho bé kia, hoặc đổi khay cát để hai bé quen mùi hương của nhau.\n3. Cho nhìn gián tiếp: Cho ăn ở hai bên cánh cửa đóng kín để tạo liên tưởng tích cực (ngửi mùi đối phương = có đồ ăn ngon).\n4. Tiếp xúc trực tiếp: Mở hé cửa hoặc dùng rào chắn cho nhìn nhau, thưởng pate khi hai bé bình tĩnh. Tiến tới thả chung dưới sự giám sát.',
  NOW(),
  NOW()
), (
  'làm quen chó mới,giới thiệu chó mới,chó đánh nhau',
  'Quy trình giới thiệu làm quen chó mới với chó cũ an toàn:\n1. Gặp nhau ở nơi trung lập: Đưa hai bé đến một địa điểm công cộng xa lạ (như công viên) để tránh việc chó cũ bảo vệ lãnh thổ nhà mình. Cả hai đều phải được xích giữ chắc chắn.\n2. Đi dạo song song: Cho hai bé đi dạo song song cách nhau khoảng 2-3 mét, sau đó cho ngửi hông nhau từ từ nếu không có biểu hiện gầm gừ dựng lông gáy.\n3. Đưa về nhà: Cho chó mới vào nhà trước và cách ly trong phòng riêng vài ngày. Giám sát chặt chẽ các cuộc gặp gỡ trực tiếp đầu tiên, không để đồ chơi hoặc bát ăn chung để tránh tranh giành tài nguyên.',
  NOW(),
  NOW()
), (
  'bệnh fip ở mèo,viêm phúc mạc mèo,fip khô,fip ướt,tràn dịch màng bụng',
  'Bệnh FIP (Viêm phúc mạc truyền nhiễm ở mèo) cực kỳ nguy hiểm do virus Coronavirus đột biến:\n- Triệu chứng:\n+ FIP thể ướt: Bụng phình to tích dịch lỏng màu vàng rơm, mèo khó thở do tràn dịch màng phổi, sốt cao kéo dài không hạ bằng kháng sinh thông thường, sụt cân uể oải.\n+ FIP thể khô: Không tích dịch nhưng gây tổn thương các cơ quan nội tạng, viêm mắt (mắt đục), co giật loạng chạng thần kinh.\n- LƯU Ý BẮT BUỘC: Đây là bệnh có tỷ lệ tử vong cực kỳ cao nếu không điều trị bằng thuốc kháng virus đặc hiệu (GS-441524). Bạn BẮT BUỘC phải đưa mèo đi thú y xét nghiệm máu, siêu âm dịch bụng để chẩn đoán và điều trị kịp thời.',
  NOW(),
  NOW()
), (
  'bệnh felv ở mèo,ung thư máu mèo,lơ xê mi mèo',
  'Bệnh FeLV (Virus lơ-xê-mi/ung thư máu truyền nhiễm ở mèo):\n- Cách lây truyền: Lây qua nước bọt, nước tiểu, dùng chung bát ăn hoặc mèo cắn nhau. Tấn công hệ thống miễn dịch làm suy yếu cơ thể.\n- Triệu chứng: Nướu nhợt nhạt trắng bệch (thiếu máu nặng), viêm nướu miệng loét dai dẳng, sốt kéo dài, dễ nhiễm trùng cơ hội, sụt cân xơ xác.\n- LƯU Ý BẮT BUỘC: Bệnh không có thuốc chữa khỏi hoàn toàn, mục tiêu là hỗ trợ miễn dịch. Bạn BẮT BUỘC phải mang mèo đi thú y xét nghiệm test nhanh FeLV, tiêm phòng vắc-xin ngừa bệnh từ nhỏ và cách ly mèo bệnh khỏi mèo khỏe mạnh.',
  NOW(),
  NOW()
), (
  'bệnh fiv ở mèo,aids mèo,suy giảm miễn dịch mèo',
  'Bệnh FIV (Virus suy giảm miễn dịch truyền nhiễm ở mèo - bệnh AIDS mèo):\n- Cách lây truyền: Chủ yếu qua các vết cắn sâu khi mèo đực tranh giành lãnh thổ, giao phối.\n- Triệu chứng: Giai đoạn đầu không có triệu chứng rõ rệt. Lâu dần hệ miếng dịch suy sụp khiến mèo hay bị viêm loét miệng cực đau đớn, viêm da mãn tính, tiêu chảy dai dẳng, sụt cân rộc rạc.\n- LƯU Ý BẮT BUỘC: FIV không lây sang người. Mèo bị FIV vẫn có thể sống nhiều năm nếu được chăm sóc tốt và nuôi hoàn toàn trong nhà. Bạn BẮT BUỘC phải đưa bé đi thú y định kỳ xét nghiệm huyết học và điều trị ngay lập tức các nhiễm trùng cơ hội.',
  NOW(),
  NOW()
), (
  'chảy máu cam,chảy máu mũi,chảy máu lỗ mũi',
  'Hiện tượng chảy máu cam (chảy máu mũi) ở chó mèo:\n- Sơ cứu tại nhà: Giữ thú cưng nằm yên tĩnh, tránh hoảng loạn làm tăng huyết áp chảy máu nhiều hơn. Đặt một túi đá lạnh bọc trong khăn sạch chườm lên sống mũi của bé để co mạch máu giúp cầm máu tạm thời. KHÔNG nhét bông gòn hay giấy vào sâu lỗ mũi bé.\n- LƯU Ý BẮT BUỘC: Chảy máu mũi có thể là biểu hiện của chấn thương nghiêm trọng, ngộ độc thuốc diệt chuột (chất chống đông máu), ký sinh trùng đường máu (như Ehrlichia ở chó) hoặc có dị vật/khối u trong mũi. Bạn BẮT BUỘC phải mang bé đến phòng khám thú y ngay lập tức để cấp cứu và xét nghiệm máu đông.',
  NOW(),
  NOW()
), (
  'hạ canxi,tụt canxi,sốt sữa,eclampsia',
  'Hội chứng hạ canxi huyết cấp tính (sốt sữa / eclampsia) ở chó mèo mẹ sau sinh:\n- Triệu chứng: Xuất hiện đột ngột sau sinh 1-4 tuần. Mẹ đi đứng loạng choạng, chân run rẩy co giật cứng đờ, thở dốc hổn hển dữ dội, nước dãi chảy nhiều, sốt rất cao, bỏ con rên rỉ.\n- LƯU Ý BẮT BUỘC: Đây là tình trạng cấp cứu tối khẩn cấp đe dọa tính mạng chó mèo mẹ trong vòng vài chục phút do suy tim và co thắt cơ hô hấp. Bạn BẮT BUỘC phải mang bé đi thú y ngay lập tức để được truyền Canxi Gluconate tĩnh mạch chậm dưới sự giám sát của bác sĩ, tuyệt đối không tự cho uống canxi tại nhà.',
  NOW(),
  NOW()
), (
  'viêm bàng quang kẽ,hội chứng pandora,fic mèo,mèo đi tiểu lắt nhắt',
  'Hội chứng Pandora / Viêm bàng quang vô căn (FIC) rất phổ biến ở mèo bị stress:\n- Triệu chứng: Mèo đi tiểu lắt nhắt nhiều lần, rặn tiểu kêu khóc, đi tiểu bừa bãi ra ngoài khay cát (lên giường, sofa), nước tiểu có lẫn máu hoặc đổi màu hồng nhạt. Bệnh khởi phát chủ yếu do stress tâm lý.\n- Hướng xử lý: Giảm thiểu stress tối đa (mua thêm đồ chơi, khay cát riêng), cho ăn nhiều thức ăn ướt (pate) để tăng lượng nước đi qua bàng quang.\n- LƯU Ý BẮT BUỘC: Nếu mèo đực bị tắc tiểu hoàn toàn không tiểu được giọt nào, kêu đau đớn dữ dội, bạn BẮT BUỘC phải mang đi thú y thông tiểu cấp cứu ngay lập tức để tránh tử vong do suy thận cấp.',
  NOW(),
  NOW()
), (
  'gãy xương,chấn thương,chó mèo bị ngã,chó mèo bị tai nạn',
  'Sơ cứu khi chó mèo bị chấn thương nặng hoặc gãy xương:\n- Sơ cứu tại nhà: Giữ bé nằm yên vị trí phẳng mát, hạn chế di chuyển bé tối đa để tránh đầu xương gãy đâm rách mạch máu/dây thần kinh. Nếu vết thương chảy máu bên ngoài, dùng gạc sạch ép nhẹ để cầm máu. Tuyệt đối không tự bó nẹp tại nhà nếu không có chuyên môn.\n- LƯU Ý BẮT BUỘC: Tai nạn, ngã cao có thể gây dập nát nội tạng, xuất huyết trong cực kỳ nguy hiểm dù bên ngoài trông có vẻ bình thường. Bạn BẮT BUỘC phải đưa thú cưng đến phòng khám thú y gần nhất lập tức để chụp X-quang, siêu âm kiểm tra nội tạng và điều trị y tế chuyên khoa.',
  NOW(),
  NOW()
), (
  'bảo hành máy cho ăn,sửa chữa máy feeder,bảo hành pawfeed,sửa pawfeed',
  'Chính sách bảo hành và sửa chữa máy cho ăn tự động PawFeed:\n- Thời hạn bảo hành: Thiết bị được bảo hành chính hãng 12 tháng kể từ ngày kích hoạt trên ứng dụng đối với toàn bộ lỗi từ nhà sản xuất (như lỗi bo mạch, hỏng động cơ xoay, lỗi cảm biến hồng ngoại).\n- Điều kiện từ chối bảo hành: Sản phẩm bị rơi vỡ, nứt móp do va đập mạnh; máy bị nước vào bo mạch thân máy do vệ sinh sai cách; sản phẩm bị chập cháy do sử dụng sai nguồn điện áp định mức.\n- Hỗ trợ kỹ thuật: Vui lòng liên hệ hotline hỗ trợ kỹ thuật trên app hoặc mang thiết bị đến trung tâm bảo hành gần nhất để được kỹ thuật viên kiểm tra sữa chữa.',
  NOW(),
  NOW()
), (
  'say xe,chó bị say xe,mèo bị say xe,nôn khi đi xe',
  'Cách xử lý và phòng ngừa say xe ở chó mèo khi đi du lịch, ô tô:\n- Triệu chứng: Bé liên tục chảy nước dãi, liếm mép, rên rỉ, đứng ngồi không yên, thở dốc và cuối cùng là nôn mửa trên xe.\n- Cách phòng ngừa:\n1. Tạm nhịn ăn: Cho bé nhịn ăn từ 6-8 tiếng trước khi đi xe (chỉ cho uống một chút nước sạch).\n2. Quen dần: Tập cho bé ngồi trên xe đứng yên tắt máy, sau đó nổ máy, rồi đi quãng đường ngắn vài phút để quen cảm giác rung lắc.\n3. Dùng thuốc say xe: Có thể liên hệ bác sĩ thú y kê đơn thuốc chống nôn say xe chuyên dụng (như Cerenia) trước khi đi 1-2 tiếng. Tuyệt đối không tự ý cho uống thuốc say xe của người.',
  NOW(),
  NOW()
), (
  'giữ ấm chó mèo,trời lạnh,mùa đông,chống rét',
  'Cách chăm sóc và giữ ấm cho chó mèo khi thời tiết chuyển lạnh hoặc mùa đông:\n- Giữ ấm nơi ngủ: Đặt ổ nằm của bé ở nơi kín gió, lót thêm chăn ấm hoặc đệm sưởi chuyên dụng cho thú cưng. Mặc thêm áo ấm cho chó mèo lông ngắn hoặc thể trạng yếu.\n- Chế độ ăn uống: Thời tiết lạnh cơ thể tiêu hao nhiều calo hơn để giữ nhiệt. Hãy sử dụng app PawFeed tăng khoảng 10% lượng hạt ăn hàng ngày cho các bé nuôi ngoài trời hoặc bán ngoài trời. Cung cấp nước ấm sạch để khuyến khích uống nước.\n- Lưu ý sức khỏe: Chó mèo già dễ bị đau khớp, cứng cơ khi trời lạnh. Tránh tắm cho bé vào những ngày lạnh gia.',
  NOW(),
  NOW()
), (
  'bệnh răng miệng mèo,tiêu răng mèo,viêm nha chu mèo,hôi miệng mèo',
  'Các bệnh răng miệng nguy hiểm phổ biến ở mèo (như Viêm nha chu, Hội chứng tiêu cổ răng TRs):\n- Triệu chứng: Mèo chảy nước dãi nhiều (đôi khi kèm máu), hơi thở hôi thối dữ dội, nướu sưng đỏ tấy đỏ bao quanh chân răng, mèo bỏ ăn pate/hạt hoặc cố ăn nhưng làm rơi vãi thức ăn và kêu đau khi nhai.\n- LƯU Ý BẮT BUỘC: Bệnh tiêu cổ răng hủy hoại chân răng từ bên trong gây đau đớn khủng khiếp cho mèo, không thể tự lành tại nhà. Bạn BẮT BUỘC phải đưa mèo đi thú y để chụp X-quang răng và nhổ bỏ những răng bị tiêu hủy để giải thoát cơn đau cho bé.',
  NOW(),
  NOW()
), (
  'sán lá phổi,ho kéo dài,chó mèo ho khan,khạc đờm',
  'Bệnh sán lá phổi (Paragonimiasis) ở chó mèo:\n- Con đường lây nhiễm: Thú cưng ăn phải cua đá, tôm sông sống hoặc nước lã chưa nấu chín có chứa ấu trùng sán lá phổi.\n- Triệu chứng: Bé bị ho kéo dài dai dẳng, ho khạc ra đờm dãi (đôi khi có lẫn vệt máu hồng), thở khò khè, khó thở nhẹ, sụt cân uể oải.\n- LƯU Ý BẮT BUỘC: Bệnh dễ bị nhầm lẫn với viêm phế quản thông thường và có thể gây biến chứng tràn dịch màng phổi nguy hiểm. Bạn BẮT BUỘC phải đưa bé đi thú y chụp X-quang phổi và xét nghiệm phân tìm trứng sán để dùng thuốc đặc trị sán lá phổi.',
  NOW(),
  NOW()
), (
  'tắm mèo con,tắm mèo lần đầu,tập tắm cho mèo',
  'Hướng dẫn cách tắm cho mèo con lần đầu tiên an toàn, tránh bị hoảng sợ:\n1. Thời điểm: Chỉ tắm khi mèo con trên 2 tháng tuổi, đã khỏe mạnh và quen thuộc với bạn. Không tắm khi bé vừa tiêm phòng trong vòng 1 tuần.\n2. Chuẩn bị: Dùng nước ấm ấm (khoảng 37-38 độ C), sữa tắm chuyên dụng cho mèo con, khăn lau khô siêu thấm và máy sấy tóc loại êm.\n3. Quy trình: Cho mèo đứng vào chậu cạn không có nước, xối nước từ cổ trở xuống thật nhẹ nhàng bằng cốc (tránh xịt vòi hoa sen áp lực lớn thẳng vào mặt bé). Xoa sữa tắm, xả sạch nước ấm nhanh chóng.\n4. Làm khô: Bọc chặt bé vào khăn khô để thấm nước, sau đó sấy thật khô lông hoàn toàn bằng máy sấy nhiệt độ ấm vừa (tránh gió lạnh làm mèo con viêm phổi).',
  NOW(),
  NOW()
), (
  'tắm cún con,tắm chó con,tắm chó lần đầu,tập tắm cho chó',
  'Hướng dẫn cách tắm cho chó con (cún con) lần đầu tiên:\n1. Chọn ngày nắng ấm, tránh tắm vào buổi tối hoặc những ngày mưa lạnh ẩm ướt.\n2. Cắt móng cho bé trước khi tắm để tránh bé hoảng sợ cào rách tay bạn.\n3. Đặt cún vào bồn tắm, dùng nước ấm dội nhẹ từ gáy xuống thân. Tuyệt đối KHÔNG dội nước trực tiếp vào tai, mắt và mũi cún vì dễ gây sặc nước và viêm tai.\n4. Dùng sữa tắm cún con xoa đều, mát-xa nhẹ nhàng tạo cảm giác dễ chịu. Xả sạch bọt bằng nước ấm.\n5. Lau thật khô bằng khăn lớn và dùng máy sấy tóc sấy khô lông hoàn toàn. Cho bé một phần thưởng nhỏ ngay sau khi tắm xong để tạo ấn tượng tốt.',
  NOW(),
  NOW()
), (
  'rách tai,cắn nhau chảy máu,vết thương ở tai,chảy máu tai',
  'Xử lý vết thương rách tai, cắn nhau chảy máu ở tai chó mèo:\n- Sơ cứu tại nhà: Tai chứa rất nhiều mạch máu nên vết rách nhỏ cũng chảy máu rất nhiều. Hãy dùng bông gạc sạch ép chặt trực tiếp lên vết rách ở tai trong 3-5 phút để cầm máu. Rửa nhẹ vết thương bằng nước muối sinh lý.\n- LƯU Ý BẮT BUỘC: Vết thương do cắn nhau chứa nhiều vi khuẩn từ nước bọt đối phương, rất dễ nhiễm trùng hoại tử và tạo áp-xe sụn tai nếu không được xử lý y tế. Bạn BẮT BUỘC phải đưa bé đi thú y để bác sĩ khâu vết thương (nếu rách rộng) và kê đơn thuốc kháng sinh kháng viêm.',
  NOW(),
  NOW()
), (
  'viêm kết mạc,sưng mắt,mắt sưng đỏ,viêm mắt',
  'Bệnh viêm kết mạc (đau mắt đỏ) ở chó mèo:\n- Triệu chứng: Phần lòng trắng và màng mắt sưng phù nề đỏ rực, mắt híp tịt chảy nhiều nước mắt và ghèn mủ màu vàng/xanh, bé nhạy cảm với ánh sáng và nheo mắt liên tục.\n- Sơ cứu: Lau sạch ghèn xung quanh bằng bông ẩm thấm nước muối sinh lý 0.9% từ trong ra ngoài.\n- LƯU Ý BẮT BUỘC: Viêm kết mạc có thể do trầy xước giác mạc, bụi bẩn hoặc nhiễm virus herpes (FHV-1 ở mèo) cực kỳ nguy hiểm. Bạn BẮT BUỘC phải đưa đi thú y khám để nhỏ thuốc kháng sinh đặc trị phù hợp, không tự ý nhỏ các thuốc chứa dexamethasone của người làm loét hỏng mắt bé.',
  NOW(),
  NOW()
), (
  'catnip,cỏ mèo phê,bột catnip,cỏ bạc hà mèo',
  'Tìm hiểu về cỏ bạc hà mèo (Catnip) đối với mèo:\n- Tác dụng: Catnip chứa hoạt chất nepetalactone kích thích thụ thể khứu giác của mèo, tạo ra trạng thái hưng phấn, phấn khích, lăn lộn, cọ xát hoặc thư giãn làm giảm stress hiệu quả.\n- Tính an toàn: Catnip hoàn toàn tự nhiên, không gây nghiện và an toàn cho mèo. Khoảng 70% mèo trưởng thành phản ứng với catnip (mèo con dưới 6 tháng tuổi thường không có phản ứng).\n- Cách dùng: Rắc một lượng nhỏ bột catnip lên đồ chơi, bàn cào móng hoặc ổ nằm của mèo 1-2 lần một tuần.',
  NOW(),
  NOW()
), (
  'cho ăn bơ,trái bơ,avocado,quả bơ độc không',
  'Lưu ý khi cho chó mèo ăn quả bơ (Avocado):\n- Chất độc Persin: Quả bơ chứa chất persin (đặc biệt trong vỏ quả, hạt bơ và lá bơ) có thể gây độc cho một số loài động vật. Tuy nhiên phần thịt bơ chín chứa lượng persin rất thấp và an toàn ở lượng nhỏ đối với chó mèo.\n- Nguy cơ béo phì: Thịt bơ giàu chất béo tốt nhưng lượng calo cực cao. Ăn nhiều bơ dễ gây đầy bụng, tiêu chảy nhẹ hoặc béo phì ở chó mèo.\n- Nguy cơ hóc dị vật: Hạt quả bơ to, tròn và trơn trượt là dị vật gây nghẹn đường thở hoặc tắc ruột cực kỳ nguy hiểm nếu chó nuốt phải.\n- LƯU Ý BẮT BUỘC: Nếu cún cưng nuốt phải hạt bơ và có dấu hiệu nghẹn, nôn mửa liên tục, bỏ ăn bụng đau cứng, bạn BẮT BUỘC phải đưa đi thú y cấp cứu gấp.',
  NOW(),
  NOW()
), (
  'bánh ngọt,cho ăn đồ ngọt,đường,kẹo',
  'Tác hại của đồ ngọt, bánh kẹo đối với sức khỏe chó mèo:\n- Nguy cơ trước mắt: Ăn nhiều đồ ngọt gây đầy hơi, khó tiêu, tiêu chảy do hệ tiêu hóa của thú cưng không được thiết kế để xử lý lượng đường cao.\n- Nguy cơ lâu dài: Gây béo phì, sâu răng nặng, viêm nha chu và dẫn đến bệnh tiểu đường (đái tháo đường) rất khó chữa trị ở chó mèo.\n- Chất độc Xylitol: CỰC KỲ NGUY HIỂM. Nhiều loại bánh kẹo, kẹo cao su không đường của người chứa chất tạo ngọt Xylitol. Khi chó mèo ăn phải, Xylitol gây giải phóng insulin cấp tốc dẫn đến hạ đường huyết cực độ, suy gan cấp và tử vong chỉ sau vài giờ.\n- LƯU Ý BẮT BUỘC: Nếu phát hiện thú cưng lỡ ăn phải kẹo hay bánh chứa chất Xylitol, bạn BẮT BUỘC phải đưa bé đi cấp cứu thú y ngay lập tức.',
  NOW(),
  NOW()
), (
  'bát ăn nhựa,bát inox,bát sứ,chọn bát ăn cho chó mèo',
  'Lựa chọn chất liệu bát ăn tốt nhất cho chó mèo:\n- Bát nhựa: Giá rẻ, nhẹ nhưng dễ bị trầy xước tạo thành các khe hở li ti. Đây là nơi vi khuẩn tích tụ cực kỳ nhanh dù có rửa bát, dễ gây hội chứng "mụn cằm" (nổi mụn đầu đen, sưng mủ ở cằm mèo) và dị ứng da.\n- Bát inox hoặc bát sứ: Khuyên dùng. Bề mặt inox nhẵn bóng, bát sứ tráng men cao cấp rất dễ lau chùi vệ sinh sạch sẽ, ngăn ngừa vi khuẩn phát triển, an toàn tuyệt đối cho cằm thú cưng.\n- Sử dụng với PawFeed: Thiết bị PawFeed sử dụng khay ăn bằng inox 304 tiêu chuẩn thực phẩm, tháo lắp dễ dàng để bảo vệ sức khỏe tối đa cho bé.',
  NOW(),
  NOW()
), (
  'đổi hạt thức ăn,thay đổi thức ăn,quy tắc 7 ngày,chuyển hạt',
  'Quy trình đổi hạt thức ăn mới cho chó mèo tránh rối loạn tiêu hóa (Quy tắc 7 ngày):\n- Nguyên tắc: Hệ vi sinh đường ruột của chó mèo rất nhạy cảm. Đột ngột thay đổi loại hạt mới sẽ gây tiêu chảy, nôn mửa do đường ruột chưa kịp thích nghi.\n- Phác đồ chuyển đổi trong 7 ngày:\n+ Ngày 1 & 2: Trộn 75% hạt cũ + 25% hạt mới.\n+ Ngày 3 & 4: Trộn 50% hạt cũ + 50% hạt mới.\n+ Ngày 5 & 6: Trộn 25% hạt cũ + 75% hạt mới.\n+ Ngày 7: Cho ăn hoàn toàn 100% hạt mới.\n- Theo dõi phân của bé trong suốt quá trình chuyển hạt để điều chỉnh tốc độ trộn hạt phù hợp.',
  NOW(),
  NOW()
), (
  'ghi âm gọi ăn,giọng nói gọi ăn,thu âm máy cho ăn,ghi âm pawfeed',
  'Tính năng ghi âm giọng nói gọi ăn trên máy cho ăn tự động PawFeed:\n- Tác dụng: Cho phép bạn thu âm một đoạn giọng nói ngắn (khoảng 10 giây, ví dụ: "Miu ơi ăn cơm thôi!") phát ra từ loa của máy cho ăn mỗi khi đến giờ nhả hạt theo lịch trình.\n- Lợi ích tâm lý: Giọng nói quen thuộc của chủ giúp thú cưng giảm bớt lo âu, tạo phản xạ có điều kiện kích thích vị giác và giúp bé cảm thấy ấm áp, an tâm như luôn có chủ ở nhà bên cạnh chăm sóc.',
  NOW(),
  NOW()
), (
  'bệnh gan chó mèo,suy gan,vàng da,chế độ ăn bệnh gan',
  'Chế độ dinh dưỡng và dấu hiệu bệnh gan ở chó mèo:\n- Triệu chứng: Thú cưng bỏ ăn, mệt mỏi ủ rũ, nôn mửa dịch vàng, sụt cân, đặc biệt niêm mạc mắt, lợi miệng và da vùng bụng có màu vàng đậm (vàng da do bilirubin tăng).\n- Chế độ ăn cho bé bệnh gan: Cần protein chất lượng cao dễ hấp thụ với lượng vừa phải, giảm lượng đồng, bổ sung kẽm và các chất chống oxy hóa (vitamin E, C, Silymarin từ cây kế sữa).\n- LƯU Ý BẮT BUỘC: Bệnh gan cấp tính tiến triển rất nhanh dẫn đến hôn mê gan tử vong. Khi thấy bé có biểu hiện vàng da hoặc bỏ ăn lâu ngày (đặc biệt mèo bỏ ăn dễ gây gan nhiễm mỡ cấp), bạn BẮT BUỘC phải đưa đi bệnh viện thú y cấp cứu truyền dịch nâng đỡ gan ngay lập tức.',
  NOW(),
  NOW()
), (
  'bệnh tim chó mèo,suy tim,ho khi nằm,chế độ ăn bệnh tim',
  'Chế độ dinh dưỡng và nhận biết bệnh tim ở chó mèo:\n- Triệu chứng: Bé dễ mệt mỏi khi vận động nhẹ, ho khạc khan kéo dài đặc biệt là vào ban đêm hoặc khi nằm nghỉ, thở nhanh nông, bụng phình to tích dịch (cổ trướng), niêm mạc tím tái khi phấn khích.\n- Chế độ dinh dưỡng: Bắt buộc hạn chế muối (natri cực thấp) trong khẩu phần hạt/pate để tránh tích nước tăng huyết áp áp lực lên tim. Bổ sung axit amin Taurine (đặc biệt quan trọng với mèo để tránh bệnh cơ tim giãn nở) và L-Carnitine hỗ trợ cơ tim co bóp.\n- LƯU Ý BẮT BUỘC: Bệnh tim có thể gây suy hô hấp đột ngột hoặc đột tử. Bạn BẮT BUỘC phải đưa bé đi thú y siêu âm tim, chụp X-quang ngực để chẩn đoán và uống thuốc trợ tim duy trì suốt đời.',
  NOW(),
  NOW()
), (
  'mọc răng chó con,ngứa răng cún,chó con cắn phá,đồ chơi gặm',
  'Chăm sóc cún con trong giai đoạn mọc răng (từ 3 đến 8 tháng tuổi):\n- Triệu chứng: Cún con chảy nhiều nước dãi, nướu sưng đỏ ngứa ngáy dữ dội dẫn đến hành vi gặm cắn nát bét giày dép, chân bàn ghế hoặc cắn vào tay chủ để giảm ngứa răng.\n- Cách xử lý:\n1. Đồ chơi gặm chuyên dụng: Mua các loại đồ chơi bằng cao su tự nhiên dai bền hoặc xương gặm sạch răng làm bằng da bò.\n2. Làm mát đồ chơi: Để đồ chơi gặm vào tủ đông mát lạnh trước khi cho cún chơi, giúp làm dịu sưng đau nướu rất tốt.\n3. Huấn luyện: Nói "Không" dứt khoát khi cún cắn tay bạn và hướng cún sang đồ chơi gặm thay thế.',
  NOW(),
  NOW()
), (
  'mọc răng mèo con,mèo ngứa răng,mèo con cắn tay,mèo gặm đồ',
  'Chăm sóc mèo con trong giai đoạn thay mọc răng (từ 3 đến 7 tháng tuổi):\n- Triệu chứng: Bé ngứa nướu, thích gặm các sợi dây điện, cắn góc sách, cào cắn tay và cổ chân của chủ khi đùa nghịch.\n- Cách xử lý:\n1. Đồ chơi gặm cho mèo: Mua thanh gỗ catnip (thanh chew stick), đồ chơi vải chứa cỏ bạc hà mèo hoặc đồ chơi cao su mềm kích thước nhỏ.\n2. Cảnh báo an toàn: Thu dọn tất cả dây điện, dây thừng nhỏ, kim chỉ trong nhà để tránh mèo ngậm nuốt phải gây tắc ruột chết người.\n3. Tuyệt đối không dùng tay làm đồ chơi đùa nghịch trực tiếp với mèo con để tránh tạo thói quen xấu cắn tay chủ khi trưởng thành.',
  NOW(),
  NOW()
), (
  'bệnh dại ở người,chó cắn người,mèo cắn người,xử lý vết cắn',
  'Cách xử lý khẩn cấp khi bị chó mèo cắn hoặc cào xước chảy máu:\n- Sơ cứu vết thương ngay lập tức: Rửa vết thương dưới vòi nước chảy liên tục cùng xà phòng trong ít nhất 15 phút. Sát trùng lại bằng cồn 70 độ hoặc cồn Betadine. KHÔNG băng kín vết thương.\n- Theo dõi thú cưng: Nhốt xích và theo dõi sát hoạt động của con vật cắn trong vòng 10-15 ngày (xem có biểu hiện dại như sợ nước, sợ gió, chảy dãi sùi bọt mép, hung dữ đột ngột).\n- LƯU Ý BẮT BUỘC: Bệnh dại khi đã phát bệnh trên người có tỷ lệ tử vong là 100%. Bạn BẮT BUỘC phải đến ngay trung tâm y tế dự phòng (như VNVC, Viện Pasteur) để được bác sĩ khám và tiêm vắc-xin phòng dại (cùng huyết thanh kháng dại nếu vết cắn sâu ở đầu, cổ, tay) càng sớm càng tốt.',
  NOW(),
  NOW()
), (
  'khay ăn bị kiến,kiến bu khay hạt,diệt kiến khay ăn,bảo vệ khay hạt',
  'Cách xử lý và ngăn ngừa kiến bu vào khay ăn hạt của máy PawFeed:\n1. Vệ sinh sạch sẽ: Lau chùi khu vực đặt máy cho ăn, rửa sạch khay ăn inox PawFeed hàng ngày để tránh vụn hạt rớt ra thu hút kiến.\n2. Tạo vòng chắn nước: Đặt máy cho ăn lên trên một tấm thảm chống kiến hoặc đặt khay ăn inox vào một khay nước nông lớn hơn (tạo rãnh nước ngăn kiến bò qua).\n3. Sử dụng phấn diệt kiến: Vẽ một vòng phấn diệt kiến (hoặc bôi một vòng mỡ dầu hỏa mỏng) xung quanh chân đế máy cho ăn để ngăn kiến leo lên. Tuyệt đối không xịt thuốc diệt côn trùng hóa chất trực tiếp lên máy hoặc khay ăn vì có thể gây ngộ độc chết người cho thú cưng.',
  NOW(),
  NOW()
), (
  'nghẹn dị vật,mắc cổ họng,hóc xương,sơ cứu nghẹn',
  'Sơ cứu khẩn cấp khi chó mèo bị hóc dị vật hoặc nghẹn cổ họng:\n- Triệu chứng: Bé ho khạc dữ dội, cào liên tục vào miệng, chảy dãi ròng ròng, khó thở khò khè, mắt trợn ngược trợn, niêm mạc lưỡi chuyển sang màu tím tái do thiếu oxy.\n- Cách xử lý khẩn cấp:\n1. Kiểm tra miệng: Mở rộng miệng bé dưới ánh sáng đèn pin, nếu thấy dị vật (như xương, đồ chơi nhỏ) ở nông, dùng nhíp gắp ra cẩn thận.\n2. Nghiệm pháp Heimlich: ôm bé từ phía sau dưới cơ hoành, dùng lực ép mạnh và nhanh hướng lên trên ngực 5 lần liên tục để tống dị vật ra ngoài.\n- LƯU Ý BẮT BUỘC: Nghẹn đường thở gây tử vong do ngạt thở trong vài phút. Sau khi thực hiện sơ cứu tống dị vật ra ngoài, bạn BẮT BUỘC phải đưa bé đến phòng khám thú y ngay lập tức để bác sĩ kiểm tra nội soi tổn thương đường thở.',
  NOW(),
  NOW()
), (
  'hạ đường huyết,tụt đường huyết cún con,chó con lờ đờ,co giật hạ đường huyết',
  'Hội chứng hạ canxi huyết cấp tính (sốt sữa / eclampsia) ở chó mèo mẹ sau sinh:\n- Triệu chứng: Xuất hiện đột ngột sau sinh 1-4 tuần. Mẹ đi đứng loạng choạng, chân run rẩy co giật cứng đờ, thở dốc hổn hển dữ dội, nước dãi chảy nhiều, sốt rất cao, bỏ con rên rỉ.\n- LƯU Ý BẮT BUỘC: Đây là tình trạng cấp cứu tối khẩn cấp đe dọa tính mạng chó mèo mẹ trong vòng vài chục phút do suy tim và co thắt cơ hô hấp. Bạn BẮT BUỘC phải mang bé đi thú y ngay lập tức để được truyền Canxi Gluconate tĩnh mạch chậm dưới sự giám sát của bác sĩ, tuyệt đối không tự cho uống canxi tại nhà.',
  NOW(),
  NOW()
), (
  'nấm tai,viêm tai do nấm,tai chảy dịch đen,ngứa tai do nấm',
  'Bệnh nấm tai (viêm tai do nấm Malassezia) ở chó mèo:\n- Triệu chứng: Bé liên tục lắc đầu, gãi tai chảy máu xước da, tai bốc mùi chua nồng rất khó chịu, tai trong đỏ rực sưng nề và chảy dịch nhầy màu nâu sẫm hoặc đen dính dính.\n- Nguyên nhân: Độ ẩm tai cao (sau khi tắm bị nước vào), rận tai không chữa trị tạo điều kiện cho nấm phát triển.\n- LƯU Ý BẮT BUỘC: Không tự ý dùng tăm bông chọc sâu vào lỗ tai bé vì có thể đẩy nấm vào sâu gây rách màng nhĩ viêm tai trong. Bạn BẮT BUỘC phải đưa bé đi thú y để bác sĩ nội soi tai, lấy mẫu soi kính hiển vi xác định loại nấm và kê đơn thuốc nhỏ tai kháng nấm đặc trị.',
  NOW(),
  NOW()
), (
  'giun tim,bệnh giun tim,muỗi đốt truyền bệnh giun tim,ho khan khó thở',
  'Bệnh giun tim (Dirofilaria immitis) cực kỳ nguy hiểm ở chó mèo:\n- Con đường lây truyền: Qua vết đốt của muỗi mang ấu trùng giun tim. Giun phát triển dài ra ký sinh trực tiếp trong tim và động mạch phổi của thú cưng.\n- Triệu chứng: Ho khan kéo dài dai dẳng, khó thở thở gấp khi vận động nhẹ, cơ thể suy kiệt gầy gò, bụng phình to do tích nước (suy tim phải).\n- LƯU Ý BẮT BUỘC: Đây là bệnh tiến triển âm thầm gây suy tim chết người, việc điều trị diệt giun tim trưởng thành rất phức tạp nguy hiểm. Bạn BẮT BUỘC phải mang bé đi thú y xét nghiệm máu định kỳ và sử dụng thuốc phòng ngừa giun tim hàng tháng theo phác đồ.',
  NOW(),
  NOW()
), (
  'cho uống thuốc viên,mẹo cho uống thuốc,đút thuốc viên,cho mèo uống thuốc',
  'Mẹo đút cho chó mèo uống thuốc viên dễ dàng tại nhà:\n- Cách 1: Giấu thuốc vào đồ ăn ngon. Nhét viên thuốc vào giữa miếng phô mai lát, một viên pate đông lạnh nhỏ hoặc thịt luộc thơm ngon để bé tự nuốt chửng.\n- Cách 2: Đút trực tiếp. Dùng ngón tay mở miệng bé rộng ra, ngửa đầu bé lên trời. Đặt viên thuốc vào sâu tận đáy lưỡi (sau vòm họng), đóng miệng bé lại và vuốt nhẹ vùng cổ họng từ trên xuống dưới cho đến khi bé thực hiện phản xạ nuốt (liếm mũi là dấu hiệu đã nuốt thuốc). Có thể dùng ống kẹp đút thuốc chuyên dụng (Pill Popper) cho mèo để tránh bị cắn trúng tay.',
  NOW(),
  NOW()
), (
  'say bột ngọt,say mì chính,thú cưng dị ứng bột ngọt,bột ngọt độc hại',
  'Ngộ độc hoặc say bột ngọt (mì chính) ở chó mèo:\n- Triệu chứng: Bé đi đứng loạng choạng, cơ thể run rẩy, sùi bọt mép, nôn mửa, thở dốc và trở nên cực kỳ uể oải sau khi ăn phải thức ăn thừa của người chứa nhiều bột ngọt.\n- Cách xử lý tại nhà: Cho bé uống nhiều nước sạch để tăng đào thải chất độc qua nước tiểu. Tạm ngưng cho ăn các thức ăn nêm gia vị.\n- LƯU Ý BẮT BUỘC: Nếu bé co giật, hôn mê, hoặc sùi bọt mép không ngừng, bạn BẮT BUỘC phải đưa bé đi thú y ngay lập tức để truyền dịch thải độc cấp tốc.',
  NOW(),
  NOW()
), (
  'sứt móng,gãy móng chân,chảy máu móng,bật móng',
  'Xử lý khi chó mèo bị sứt móng hoặc gãy móng chân:\n- Sơ cứu tại nhà: Dùng bông gạc sạch ép chặt trực tiếp vào móng bị gãy trong 3-5 phút để cầm máu. Có thể dùng bột cầm máu hoặc bột bắp ấn vào. Lau sạch vết thương bằng nước muối sinh lý hoặc cồn Betadine loãng.\n- LƯU Ý BẮT BUỘC: Móng chân gãy lộ tủy rất đau và rất dễ bị nhiễm trùng xương ngón chân nếu bé đi lại tiếp xúc với cát bụi bẩn. Nếu móng bị bật hoàn toàn, sưng mủ, hoặc chảy dịch hôi, bạn BẮT BUỘC phải đưa bé đi thú y để bác sĩ rút móng an toàn và băng bó.',
  NOW(),
  NOW()
), (
  'bỏng nước sôi,bị bỏng,bỏng dầu ăn,bỏng da',
  'Sơ cứu khi chó mèo bị bỏng (bỏng nước sôi, bỏng dầu ăn, hóa chất):\n- Sơ cứu khẩn cấp: Xả nhẹ nước mát sạch lên vùng da bị bỏng liên tục trong 15-20 phút để giảm nhiệt độ da và giảm tổn thương mô sâu. KHÔNG bôi kem đánh răng, mỡ trăn hoặc đá lạnh buốt trực tiếp lên vết bỏng.\n- LƯU Ý BẮT BUỘC: Vết bỏng sâu hoặc diện rộng có thể gây sốc đau đớn, mất nước và nhiễm trùng máu cực kỳ nguy hiểm. Sau khi hạ nhiệt bằng nước mát, bạn BẮT BUỘC phải đưa bé đến thú y để bác sĩ dùng thuốc mỡ kháng khuẩn chuyên dụng và băng bó vô trùng.',
  NOW(),
  NOW()
), (
  'sốc phản vệ,dị ứng vắc xin,phản ứng sau tiêm,tiêm vắc xin bị sốc',
  'Hội chứng sốc phản vệ cấp tính sau khi tiêm phòng vắc-xin ở chó mèo:\n- Triệu chứng: Thường xảy ra trong vòng vài phút đến vài giờ sau tiêm. Bé bị sưng phù nề đột ngột vùng mặt, nôn mửa dữ dội, tiêu chảy lỏng, nổi mề đay ngứa ngáy, thở khò khè khó thở, niêm mạc nhợt nhạt và ngã quỵ.\n- LƯU Ý BẮT BUỘC: Đây là phản ứng dị ứng đe dọa tính mạng cấp tính. Bạn BẮT BUỘC phải đưa bé quay lại phòng khám thú y ngay lập tức để bác sĩ tiêm thuốc chống sốc khẩn cấp (như Epinephrine, Corticosteroid), tuyệt đối không tự điều trị tại nhà.',
  NOW(),
  NOW()
), (
  'ghẻ tai,ký sinh trùng tai,ngứa tai dữ dội',
  'Bệnh ghẻ tai (do ký sinh trùng Otodectes cynotis) ở chó mèo:\n- Triệu chứng: Bé ngứa tai dữ dội, gãi tai liên tục đến trầy xước rỉ máu, tai chảy nhiều vảy màu đen sẫm giống bã cà phê, bốc mùi hôi thối khó chịu.\n- LƯU Ý BẮT BUỘC: Ghẻ tai lây lan cực nhanh giữa các thú cưng nuôi chung và dễ gây viêm tai giữa nguy hại nếu không chữa dứt điểm. Bạn BẮT BUỘC phải đưa đi thú y khám nội soi tai để chẩn đoán xác định ghẻ tai và sử dụng thuốc nhỏ tai hoặc thuốc nhỏ gáy đặc trị ve rận ghẻ tai.',
  NOW(),
  NOW()
), (
  'tỏi tây,hành lá,hẹ,cho ăn hành hẹ',
  'Độc hại từ tỏi tây, hành lá, hẹ đối với chó mèo:\n- Tác hại: Các loài thực vật thuộc họ Allium này chứa hợp chất thiosulphate phá hủy các tế bào hồng cầu trong máu của chó mèo, gây ra bệnh thiếu máu huyết tán cực kỳ nguy hiểm.\n- Triệu chứng ngộ độc: Xuất hiện sau vài ngày ăn phải. Bé mệt mỏi ủ rũ, thở dốc, nước tiểu có màu đỏ sẫm hoặc nâu đen, nướu lợi miệng nhợt nhạt trắng bệch, nôn mửa tiêu chảy.\n- LƯU Ý BẮT BUỘC: Nếu phát hiện thú cưng lỡ ăn phải hành, tỏi tây hoặc hẹ với lượng lớn, bạn BẮT BUỘC phải đưa bé đi thú y khám xét nghiệm máu để truyền máu hoặc điều trị thải độc kịp thời.',
  NOW(),
  NOW()
), (
  'nấm dại,ăn nấm ngoài vườn,ngộ độc nấm,thú cưng ăn nấm',
  'Nguy hại khi chó mèo ăn nấm dại ngoài vườn dạo chơi:\n- Tác hại: Nhiều loại nấm dại chứa độc tố amatoxin hoặc muscarine cực mạnh gây suy gan, suy thận cấp tính hoặc phá hủy hệ thần kinh trung ương.\n- Triệu chứng ngộ độc: Nôn mửa dữ dội, chảy nước dãi ròng ròng, co giật, ảo giác đi đứng lờ đờ, đồng tử giãn, tiêu chảy ra máu.\n- LƯU Ý BẮT BUỘC: Đây là tình trạng ngộ độc khẩn cấp đe dọa tính mạng chỉ trong vài giờ. Bạn BẮT BUỘC phải mang thú cưng cùng mẫu nấm (nếu có) đến phòng khám thú y gần nhất lập tức để rửa dạ dày cứu mạng.',
  NOW(),
  NOW()
), (
  'say cà phê,say trà,ngộ độc caffeine,caffeine',
  'Ngộ độc chất caffeine (trong cà phê, trà, nước ngọt tăng lực) ở chó mèo:\n- Tác hại: Chất caffeine kích thích quá mức hệ tim mạch và hệ thần kinh trung ương của chó mèo. Liều lượng nhỏ cũng có thể gây ngộ độc chết người.\n- Triệu chứng: Bồn chồn mất ngủ, thở nhanh nông, nhịp tim đập nhanh hỗn loạn (loạn nhịp), run rẩy tay chân, co giật và tử vong.\n- LƯU Ý BẮT BUỘC: Nếu cún mèo lỡ uống phải nước cà phê đậm đặc hoặc ăn bã cà phê, bạn BẮT BUỘC phải đưa bé đi thú y cấp cứu thải độc ngay lập tức.',
  NOW(),
  NOW()
), (
  'viêm gan truyền nhiễm,bệnh adenovirus chó,suy gan chó',
  'Bệnh viêm gan truyền nhiễm ở chó (do Canine Adenovirus loại 1):\n- Triệu chứng: Chó bị sốt cao đột ngột, bỏ ăn nằm ủ rũ, nôn mửa, tiêu chảy, đau đớn vùng bụng phải (vùng gan), kết mạc mắt xuất hiện màng xanh (mắt xanh) và có biểu hiện xuất huyết dưới da.\n- LƯU Ý BẮT BUỘC: Đây là bệnh truyền nhiễm virus nguy hiểm có tỷ lệ tử vong cao ở chó con. Bạn BẮT BUỘC phải đưa bé đi cách ly và điều trị hồi sức tích cực tại bệnh viện thú y ngay lập tức khi phát hiện triệu chứng hô hấp/tiêu hóa đi kèm màng xanh ở mắt.',
  NOW(),
  NOW()
), (
  'điện giật,cắn dây điện,bị giật điện',
  'Sơ cứu khẩn cấp khi chó mèo bị điện giật (phổ biến do cắn dây điện):\n1. Đảm bảo an toàn: Ngắt ngay nguồn điện chính trước khi chạm vào thú cưng. Tuyệt đối không chạm vào bé khi điện chưa ngắt.\n2. Kiểm tra hô hấp: Nếu bé ngừng thở nhưng tim còn đập, thực hiện hô hấp nhân tạo nhẹ nhàng.\n3. Xử lý vết bỏng: Bỏng điện thường gây loét đỏ ở lưỡi và niêm mạc miệng của bé.\n- LƯU Ý BẮT BUỘC: Điện giật có thể gây phù phổi cấp (tích dịch ở phổi) tiến triển sau vài giờ làm bé ngạt thở chết. Bạn BẮT BUỘC phải mang bé đến phòng khám thú y khẩn cấp để chụp X-quang phổi và theo dõi y tế.',
  NOW(),
  NOW()
), (
  'mèo lú lẫn,mèo mất nhận thức,hội chứng suy giảm nhận thức tuổi già',
  'Hội chứng suy giảm nhận thức do tuổi già (Lú lẫn/Alzheimer ở chó mèo):\n- Triệu chứng: Bé đi lang thang vô định xung quanh nhà, đứng nhìn chăm chăm vào góc tường hoặc kẹt cửa, kêu khóc rên rỉ lớn vào ban đêm không rõ lý do, quên vị trí khay cát hoặc đĩa ăn, giảm phản xạ tương tác với chủ.\n- Cách hỗ trợ: Giữ nguyên bố cục đồ đạc trong nhà tránh thay đổi gây stress. Thiết lập máy cho ăn tự động PawFeed đúng giờ để tạo thói quen cố định giúp bé cảm thấy an tâm. Bổ sung omega-3 và các chất chống oxy hóa cho não bộ.',
  NOW(),
  NOW()
), (
  'dọn dẹp chuồng trại,khử trùng ổ dịch,vệ sinh phòng dịch parvo care',
  'Hướng dẫn khử trùng dọn dẹp môi trường khi thú cưng bị bệnh truyền nhiễm (Parvo, Care, Giảm bạch cầu):\n- Dung dịch khử trùng hiệu quả: Các loại virus này cực kỳ cứng đầu, hầu hết nước lau nhà thông thường không diệt được. BẮT BUỘC phải dùng dung dịch nước tẩy Javel (chứa Sodium Hypochlorite) pha loãng theo tỷ lệ 1:32 hoặc thuốc sát trùng chuyên dụng Chlorine/Virkon.\n- Cách thực hiện: Lau rửa toàn bộ sàn nhà, chuồng nuôi, khay cát và ngâm bát ăn trong dung dịch sát trùng tối thiểu 10-15 phút trước khi xả sạch lại bằng nước. Cách ly triệt để bé bệnh.',
  NOW(),
  NOW()
), (
  'bệnh coryza,cúm mèo,viêm mũi khí quản mèo,herpesvirus mèo',
  'Bệnh Coryza (Cúm mèo / Viêm mũi khí quản truyền nhiễm ở mèo):\n- Triệu chứng: Mèo hắt hơi liên tục, chảy nhiều dịch mũi đặc màu xanh/vàng gây nghẹt thở, mắt đỏ hoe đổ nhiều dử ghèn bít híp mắt, loét miệng lưỡi gây đau đớn không ăn được pate/hạt, sốt cao.\n- LƯU Ý BẮT BUỘC: Bệnh lây lan cực nhanh qua đường hô hấp và dễ biến chứng mù lòa hoặc viêm phổi tử vong ở mèo con. Bạn BẮT BUỘC phải đưa mèo đi thú y để dùng thuốc kháng sinh chống nhiễm trùng thứ phát, nhỏ mắt đặc trị virus và hỗ trợ dinh dưỡng kịp thời.',
  NOW(),
  NOW()
), (
  'ho cũi chó,viêm khí phế quản truyền nhiễm,kennel cough',
  'Bệnh ho cũi chó (Kennel Cough / Viêm khí phế quản truyền nhiễm ở chó):\n- Triệu chứng: Chó ho khan sâu nghe như có dị vật mắc kẹt trong họng (ho khạc khạc), dễ ho nhiều hơn sau khi vận động mạnh hoặc khi kéo xích cổ, chảy nước mũi nhẹ, thỉnh thoảng khạc ra bọt trắng.\n- LƯU Ý BẮT BUỘC: Bệnh lây lan rất mạnh ở những nơi nuôi nhiều chó. Nếu chó sốt cao, lờ đờ bỏ ăn hoàn toàn hoặc thở khó thở gấp, bạn BẮT BUỘC phải đưa bé đi thú y khám để tránh biến chứng viêm phổi nguy hiểm.',
  NOW(),
  NOW()
), (
  'tập lồng vận chuyển,cho mèo vào lồng,lồng vận chuyển',
  'Mẹo tập cho mèo quen và thích ứng với lồng vận chuyển (Carrier):\n1. Để lồng mở sẵn: Đặt lồng vận chuyển mở nắp ở phòng khách như một ổ nằm bình thường trong vài ngày để mèo làm quen, không cất kín.\n2. Tạo liên kết tích cực: Đặt một ít hạt khô thơm ngon hoặc rải bột catnip vào trong lồng để dụ mèo tự đi vào chơi.\n3. Cho ăn trong lồng: Sử dụng khay ăn nhỏ đặt pate hoặc hạt khô của máy PawFeed ngay trước hoặc bên trong lồng vận chuyển.\n4. Đóng cửa ngắn: Tập đóng cửa lồng vài giây rồi mở ra khen thưởng ngay, sau đó tăng dần thời gian đóng cửa.',
  NOW(),
  NOW()
), (
  'đeo vòng cổ,đeo dây dắt,tập đeo dây dắt chó',
  'Hướng dẫn tập cho chó mèo quen với đeo vòng cổ và dây dắt đi dạo:\n1. Chọn vòng cổ phù hợp: Chọn loại nhẹ, mềm mại. Độ rộng vừa phải: Đút vừa 2 ngón tay giữa vòng cổ và cổ bé là đạt chuẩn.\n2. Làm quen vòng cổ: Cho đeo vòng cổ vài giờ mỗi ngày khi bé đang vui chơi hoặc ăn uống để bé phân tâm không cào gãi tháo vòng.\n3. Tập dây dắt: Móc dây dắt vào vòng cổ và để dây kéo lê tự do dưới sàn nhà dưới sự giám sát. Sau đó cầm dây dắt bé đi lại nhẹ nhàng trong nhà kèm thưởng hạt khô PawFeed khi bé đi theo hướng bạn dắt.',
  NOW(),
  NOW()
), (
  'giảm ăn đột ngột,cắt khẩu phần ăn,giảm béo an toàn',
  'Lưu ý khi giảm cân cho chó mèo béo phì (Tránh giảm ăn đột ngột):\n- Nguy hiểm từ việc nhịn ăn đột ngột: Đặc biệt ở mèo béo phì, đột ngột cắt giảm quá nhiều thức ăn hoặc bắt nhịn ăn sẽ kích hoạt hội chứng Gan nhiễm mỡ cấp tính (Hepatic Lipidosis) gây suy gan tử vong cực kỳ nhanh.\n- Nguyên tắc giảm béo an toàn: Chỉ giảm tối đa 10-15% lượng calo nạp vào mỗi tuần. Sử dụng máy cho ăn tự động PawFeed để chia nhỏ khẩu phần thành nhiều bữa nhỏ trong ngày giúp duy trì dịch vị dạ dày ổn định và cân bằng calo an toàn.',
  NOW(),
  NOW()
), (
  'cho uống nước dừa,rau má,cho chó mèo thanh nhiệt,nước dừa tốt không',
  'Bổ sung rau má, nước dừa cho chó mèo để thanh nhiệt có tốt không:\n- Nước dừa: Chứa nhiều kali và điện giải tốt, có thể cho uống lượng rất nhỏ (1-2 thìa nhỏ) để bù nước khi trời nóng. Tuy nhiên, cho uống nhiều nước dừa dễ gây tiêu chảy và tăng nồng độ kali huyết gây rối loạn tim mạch.\n- Rau má: An toàn nếu rửa cực kỳ sạch và xay lấy nước cốt loãng cho uống vài giọt. Không cho ăn cả bã xơ thô gây khó tiêu.\n- Khuyên dùng: Cách thanh nhiệt giải độc an toàn nhất cho chó mèo vẫn là cung cấp đủ nước lọc ấm sạch và che mát bóng râm phòng sốc nhiệt.',
  NOW(),
  NOW()
), (
  'tràn thức ăn,lỗi tràn khay,khay ăn quá đầy máy cho ăn',
  'Cách khắc phục khi khay ăn máy PawFeed bị tràn thức ăn ra sàn nhà:\n- Nguyên nhân: Cài đặt lượng thức ăn nhả ra mỗi bữa quá nhiều so với sức ăn thực tế của bé.\n- Hướng xử lý:\n1. Thu dọn bớt hạt thừa trên khay ăn và lau sạch khay.\n2. Sử dụng ứng dụng Web/App PawFeed để điều chỉnh giảm thời gian mở cửa xả hạt (openDurationMs) hoặc giảm bớt số lần cho ăn tự động trong ngày.',
  NOW(),
  NOW()
), (
  'loét đệm chân,sưng đệm bàn chân,chấn thương chân chó mèo',
  'Tình trạng loét đệm bàn chân ở chó mèo:\n- Triệu chứng: Đệm chân sưng tấy đỏ rực, rách nứt da đệm, rỉ dịch mủ hoặc chảy máu, bé đi khập khiễng loạng choạng, liên tục liếm láp bàn chân đau đớn.\n- Sơ cứu: Rửa chân sạch bằng nước ấm, sát trùng nhẹ bằng nước muối sinh lý hoặc xanh methylen. Băng nhẹ để tránh bụi bẩn.\n- LƯU Ý BẮT BUỘC: Loét đệm chân gây đau đớn rất nhiều và dễ nhiễm trùng sâu vào khớp xương bàn chân. Bạn BẮT BUỘC phải đưa bé đi thú y khám để bác sĩ kê đơn thuốc kháng sinh kháng viêm bôi ngoài và uống phù hợp.',
  NOW(),
  NOW()
), (
  'rụng râu mèo,mèo bị rụng râu,râu mèo rụng',
  'Tìm hiểu hiện tượng rụng râu ở mèo:\n- Thay râu sinh lý: Hoàn toàn bình thường. Mèo thường rụng râu định kỳ 1-2 sợi mỗi vài tháng và râu mới sẽ mọc lại thay thế. Râu mèo là cơ quan xúc giác cảm biến không gian cực kỳ quan trọng, tuyệt đối KHÔNG bao giờ được cắt tỉa râu của mèo.\n- Rụng râu bệnh lý: Râu rụng hàng loạt kèm theo rụng lông quanh mặt, da mặt nổi mẩn đỏ, vảy bong tróc ngứa ngáy (dấu hiệu của nấm Ringworm, ghẻ da mặt).\n- Khuyên dùng: Đưa mèo đi thú y cạo da xét nghiệm nếu rụng râu kèm viêm da quanh mặt.',
  NOW(),
  NOW()
), (
  'rận lông,rận cắn lông,chấy chó mèo,lice',
  'Tiêu diệt rận cắn lông (Lice) ở chó mèo:\n- Triệu chứng: Bé ngứa ngáy gãi cào liên tục vùng lưng và cổ, lông xơ xác rụng nhiều, khi vạch lông thấy các hạt nhỏ li ti màu trắng bám chặt vào sợi lông (trứng rận) hoặc các con rận nhỏ màu xám/vàng bò chậm trên da.\n- Xử lý: Tắm bằng dầu tắm chuyên dụng trị ve rận ghẻ. Kết hợp dùng thuốc nhỏ gáy hoặc xịt đặc trị có hoạt chất fipronil/selamectin.\n- Vệ sinh: Giặt sạch chăn nệm, ổ nằm của thú cưng bằng nước nóng để diệt trứng rận tồn dư ngoài môi trường.',
  NOW(),
  NOW()
), (
  'massage chó mèo,mẹo massage thú cưng,giảm stress',
  'Cách massage giúp chó mèo thư giãn và giảm bớt căng thẳng stress:\n1. Bắt đầu nhẹ nhàng: Vuốt ve dịu dàng từ đầu, dọc theo sống lưng xuống đuôi bằng lòng bàn tay phẳng.\n2. Vùng má và cằm: Dùng các đầu ngón tay xoa nhẹ nhàng theo hình tròn nhỏ quanh má, dưới cằm và sau tai (đây là vùng mèo cực kỳ yêu thích).\n3. Massage vùng ngực: Dùng ngón tay vuốt nhẹ vùng ngực theo vòng tròn.\n- Lợi ích: Giúp cải thiện tuần hoàn máu, làm chậm nhịp tim giúp bé bình tĩnh, giảm lo âu xa cách và thắt chặt tình cảm gắn kết với chủ nhân.',
  NOW(),
  NOW()
), (
  'chọn hạt cho mèo,chọn hạt cho chó,hạt theo độ tuổi,lựa chọn thức ăn hạt',
  'Cách chọn loại thức ăn hạt khô dựa trên giai đoạn phát triển của chó mèo:\n- Dưới 12 tháng tuổi (thú non): Chọn hạt puppy/kitten có hàm lượng đạm cao (trên 30-35%), giàu canxi và chất béo để phát triển khung xương và não bộ.\n- Từ 1 đến 7 tuổi (trưởng thành): Chọn hạt có hàm lượng dinh dưỡng cân bằng, kiểm soát calo tốt để tránh béo phì.\n- Trên 7 tuổi (lớn tuổi): Chọn hạt dễ tiêu hóa, giảm phốt pho để bảo vệ thận và bổ sung glucosamine hỗ trợ các khớp xương suy thoái.\n- Sử dụng với PawFeed để điều chỉnh liều lượng lượng ăn chính xác theo từng độ tuổi.',
  NOW(),
  NOW()
), (
  'phần cứng máy,cấu tạo máy,tính năng máy,camera,cảm biến',
  'Máy cho ăn tự động PawFeed (sử dụng board ESP8266 điều khiển động cơ Servo quay đóng mở cửa xả hạt theo thời gian tính bằng mili-giây). Thiết bị hoàn toàn KHÔNG tích hợp camera giám sát, KHÔNG có cảm biến hồng ngoại (như cảm biến phát hiện khay đầy hạt hay cảm biến tiệm cận), KHÔNG có cân trọng lượng tự động ở khay ăn, KHÔNG hỗ trợ phát giọng nói thu âm và KHÔNG có tính năng bơm nước hay dọn dẹp khay ăn tự động. Mọi hoạt động cho ăn được thực hiện bằng cách quay Servo mở cửa xả hạt theo thời gian nhận từ máy chủ qua MQTT.',
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  content = VALUES(content),
  updated_at = NOW();
