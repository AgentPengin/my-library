/**
 * MOCK DATA - CHUẨN HÓA 100% THEO FILE 'DataQuery/CREATE DATABASE.sql'
 * 
 * Khi code Backend với PostgreSQL, bạn chỉ cần thay thế các hàm ở cuối file
 * bằng các câu truy vấn db.query() tương ứng!
 */

const currentUser = {
  id: "u-1111-2222-3333-4444",
  username: "alexandria_scholar",
  email: "scholar@library.antique",
  avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
  bio: "Kẻ sưu tầm những trang sách ố vàng và những thước phim nhựa 35mm.",
  member_since: "07/09/2024",
  library_card_no: "LIB-9482-VN"
};

const mediaItems = [
  {
    id: "book_google_9780743273565",
    media_type: "BOOK",
    title: "The Great Gatsby",
    creator: "F. Scott Fitzgerald",
    release_year: "1925",
    poster_url: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=400&q=80",
    overview: "Tác phẩm kinh điển mô tả thời kỳ Hoàng kim nhạc Jazz (Roaring Twenties) tại New York, phơi bày những ảo tưởng hoa lệ và nỗi bi kịch phía sau Giấc mơ Mỹ.",
    genres: ["Kinh Điển", "Văn Học Mỹ", "Lãng Mạn"],
    average_rating: 4.8,
    total_reviews: 128
  },
  {
    id: "book_google_9780061120084",
    media_type: "BOOK",
    title: "Giết Con Chim Nhại (To Kill a Mockingbird)",
    creator: "Harper Lee",
    release_year: "1960",
    poster_url: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80",
    overview: "Câu chuyện qua lăng kính ngây thơ của cô bé Scout Finch về nạn phân biệt chủng tộc, lòng trắc ẩn và sự dũng cảm của người cha luật sư Atticus Finch.",
    genres: ["Kinh Điển", "Xã Hội", "Nhân Văn"],
    average_rating: 4.9,
    total_reviews: 215
  },
  {
    id: "movie_tmdb_157336",
    media_type: "MOVIE",
    title: "Interstellar (Hố Đen Tử Thần)",
    creator: "Christopher Nolan",
    release_year: "2014",
    poster_url: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=400&q=80",
    overview: "Khi Trái Đất không còn là nơi có thể sinh sống, một nhóm phi hành gia du hành qua một lỗ sâu vũ trụ mới được phát hiện để tìm kiếm một mái nhà mới cho nhân loại.",
    genres: ["Khoa Học Viễn Tưởng", "Phiêu Lưu", "Kịch Tính"],
    average_rating: 4.9,
    total_reviews: 342
  },
  {
    id: "book_google_9780441013593",
    media_type: "BOOK",
    title: "Dune (Xứ Cát)",
    creator: "Frank Herbert",
    release_year: "1965",
    poster_url: "https://images.unsplash.com/photo-1495640388908-05fa85288e61?auto=format&fit=crop&w=400&q=80",
    overview: "Bản hùng ca vĩ đại về hành tinh sa mạc Arrakis, cuộc tranh giành 'hương dược' quý giá nhất vũ trụ và sự trỗi dậy của vị cứu tinh Paul Atreides.",
    genres: ["Khoa Học Viễn Tưởng", "Sử Thi", "Chính Trị"],
    average_rating: 4.7,
    total_reviews: 94
  },
  {
    id: "movie_tmdb_11216",
    media_type: "MOVIE",
    title: "Cinema Paradiso (Rạp Chiếu Bóng Thiên Đường)",
    creator: "Giuseppe Tornatore",
    release_year: "1988",
    poster_url: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=400&q=80",
    overview: "Tình bạn xúc động giữa cậu bé Toto say mê màn ảnh rộng và ông lão Alfredo - người điều hành phòng chiếu máy nhựa tại một thị trấn nhỏ yên bình ở Ý.",
    genres: ["Kịch Tính", "Lãng Mạn", "Kinh Điển"],
    average_rating: 5.0,
    total_reviews: 180
  },
  {
    id: "book_google_9780451524935",
    media_type: "BOOK",
    title: "1984 (Nineteen Eighty-Four)",
    creator: "George Orwell",
    release_year: "1949",
    poster_url: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=400&q=80",
    overview: "Bức tranh phản địa đàng (Dystopia) rùng rợn và tiên tri về thế giới dưới sự giám sát toàn diện của Big Brother và Bộ Sự Thật.",
    genres: ["Dystopia", "Chính Trị", "Triết Học"],
    average_rating: 4.8,
    total_reviews: 160
  },
  {
    id: "movie_tmdb_872585",
    media_type: "MOVIE",
    title: "Oppenheimer",
    creator: "Christopher Nolan",
    release_year: "2023",
    poster_url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80",
    overview: "Bi kịch lương tâm và hành trình phát triển bom nguyên tử trong Dự án Manhattan của nhà vật lý học lý thuyết J. Robert Oppenheimer.",
    genres: ["Tiểu Sử", "Lịch Sử", "Kịch Tính"],
    average_rating: 4.8,
    total_reviews: 290
  },
  {
    id: "book_google_9780307277671",
    media_type: "BOOK",
    title: "Rừng Na Uy (Norwegian Wood)",
    creator: "Haruki Murakami",
    release_year: "1987",
    poster_url: "https://images.unsplash.com/photo-1476275466078-4007374efbbe?auto=format&fit=crop&w=400&q=80",
    overview: "Nỗi cô đơn, những rung cảm đầu đời và những mất mát khó hàn gắn của tuổi trẻ Tokyo trong thập niên 1960.",
    genres: ["Văn Học Nhật", "Tâm Lý", "Lãng Mạn"],
    average_rating: 4.6,
    total_reviews: 145
  },
  {
    id: "movie_tmdb_129",
    media_type: "MOVIE",
    title: "Spirited Away (Vùng Đất Linh Hồn)",
    creator: "Hayao Miyazaki",
    release_year: "2001",
    poster_url: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=400&q=80",
    overview: "Kiệt tác hoạt họa Studio Ghibli kể về cô bé Chihiro bị lạc vào thế giới thần linh và phù thủy bí ẩn để giải cứu cha mẹ.",
    genres: ["Hoạt Hình", "Huyền Ảo", "Gia Đình"],
    average_rating: 4.9,
    total_reviews: 410
  }
];

const shelves = [
  {
    id: "shelf-1",
    user_id: "u-1111-2222-3333-4444",
    name: "Kệ 01: Sách Gối Đầu Giường & Thưởng Thức Mùa Thu",
    description: "Những cuốn tiểu thuyết sâu lắng đọc bên tách trà ấm trong những ngày mưa lãng đãng.",
    shelf_wood: "oak", // Gỗ sồi vàng ấm
    is_public: true,
    created_at: "2024-08-15",
    items: [
      mediaItems[0], // The Great Gatsby
      mediaItems[1], // To Kill a Mockingbird
      mediaItems[7], // Norwegian Wood
      mediaItems[5]  // 1984
    ]
  },
  {
    id: "shelf-2",
    user_id: "u-1111-2222-3333-4444",
    name: "Kệ 02: Điện Ảnh Kinh Điển & Vũ Trụ Bao La",
    description: "Bộ sưu tập những cuốn phim làm lay động tâm trí và mở rộng chiều kích tư duy.",
    shelf_wood: "mahogany", // Gỗ gụ đỏ thẫm quý phái
    is_public: true,
    created_at: "2024-08-20",
    items: [
      mediaItems[2], // Interstellar
      mediaItems[4], // Cinema Paradiso
      mediaItems[6], // Oppenheimer
      mediaItems[8]  // Spirited Away
    ]
  },
  {
    id: "shelf-3",
    user_id: "u-1111-2222-3333-4444",
    name: "Kệ 03: Kho Tàng Khoa Học Viễn Tưởng (Sci-Fi Legends)",
    description: "Thế giới của các nền văn minh xa xôi, hành tinh sa mạc và công nghệ tương lai.",
    shelf_wood: "walnut", // Gỗ óc chó sẫm màu
    is_public: false,
    created_at: "2024-09-01",
    items: [
      mediaItems[3], // Dune
      mediaItems[2], // Interstellar
      mediaItems[5]  // 1984
    ]
  }
];

const reviews = [
  {
    id: "rev-101",
    user_id: "u-1111-2222-3333-4444",
    media_id: "book_google_9780743273565",
    rating: 5.0,
    content: "Đọc lại lần thứ ba vẫn không khỏi xúc động trước ánh đèn xanh bên bờ sông của Gatsby. Phong cách hành văn của Fitzgerald trau chuốt như một bản giao hưởng.",
    contains_spoilers: false,
    created_at: "2 ngày trước",
    user: {
      username: "alexandria_scholar",
      avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80"
    }
  },
  {
    id: "rev-102",
    user_id: "u-9999-8888-7777-6666",
    media_id: "book_google_9780743273565",
    rating: 4.5,
    content: "Một bức tranh chân thực về ảo tưởng vật chất. Đoạn kết luôn nằm trong danh sách những cái kết hay nhất của văn học nhân loại.",
    contains_spoilers: false,
    created_at: "1 tuần trước",
    user: {
      username: "vintage_reader_90",
      avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80"
    }
  },
  {
    id: "rev-103",
    user_id: "u-1111-2222-3333-4444",
    media_id: "movie_tmdb_157336",
    rating: 5.0,
    content: "Phần nhạc nền của Hans Zimmer kết hợp cùng diễn xuất của Matthew McConaughey ở phân đoạn nhận video từ Trái Đất là đỉnh cao của điện ảnh thế kỷ 21.",
    contains_spoilers: false,
    created_at: "5 ngày trước",
    user: {
      username: "alexandria_scholar",
      avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80"
    }
  }
];

// Helper functions mô phỏng truy vấn database
module.exports = {
  currentUser,
  mediaItems,
  shelves,
  reviews,
  
  // Lấy danh sách tất cả giá sách của user hiện tại
  getUserShelves: () => shelves,

  // Lấy chi tiết 1 giá sách kèm danh sách tác phẩm
  getShelfById: (id) => shelves.find(s => s.id === id),

  // Lấy thông tin 1 tác phẩm kèm các reviews liên quan
  getItemById: (id) => {
    const item = mediaItems.find(m => m.id === id);
    if (!item) return null;
    const itemReviews = reviews.filter(r => r.media_id === id);
    return { ...item, reviews: itemReviews };
  },

  // Tìm kiếm theo từ khóa
  searchMedia: (query, type) => {
    let results = mediaItems;
    if (type && type !== "ALL") {
      results = results.filter(m => m.media_type === type);
    }
    if (query) {
      const q = query.toLowerCase();
      results = results.filter(m => 
        m.title.toLowerCase().includes(q) || 
        m.creator.toLowerCase().includes(q) ||
        (m.genres && m.genres.some(g => g.toLowerCase().includes(q)))
      );
    }
    return results;
  }
};
