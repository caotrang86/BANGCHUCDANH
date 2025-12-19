import React, { useState, useRef } from 'react';
import { Upload, Download, Loader2, Image as ImageIcon, Sparkles, User, Briefcase, Phone, Shirt, Palette } from 'lucide-react';
import { GenerateResponse } from './types';

// Danh sách tùy chọn
const OUTFIT_OPTIONS = [
  "Vest nữ tối màu sang trọng (blazer cao cấp, phong thái CEO)",
  "Vest trắng thanh lịch (blazer trắng kem, tối giản)",
  "Đầm công sở cao cấp (tối màu, form chuẩn)",
  "Áo dài doanh nhân (trang nhã, cao cấp)",
  "Tùy chọn khác..."
];

const STYLE_OPTIONS = [
  "Giữ nguyên như ảnh tham chiếu (khuyến nghị)",
  "Có kính, phong thái tri thức",
  "Trang điểm nhẹ kiểu doanh nhân",
  "Tóc giữ nguyên, ánh sáng studio mềm"
];

const App: React.FC = () => {
  // State
  const [name, setName] = useState('');
  const [job, setJob] = useState(''); // Optional
  const [phone, setPhone] = useState('');
  
  const [outfit, setOutfit] = useState(OUTFIT_OPTIONS[0]);
  const [customOutfit, setCustomOutfit] = useState('');
  const [portraitStyle, setPortraitStyle] = useState(STYLE_OPTIONS[0]);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (!selectedFile.type.match('image.*')) {
        setError('Vui lòng chỉ tải lên file ảnh (JPG, PNG).');
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('Kích thước ảnh không được vượt quá 5MB.');
        return;
      }
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setError(null);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^[0-9\s]*$/.test(value)) {
      setPhone(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResultImage(null);

    // Validation
    if (!name.trim()) return setError('Vui lòng nhập Họ và Tên.');
    if (!phone.trim()) return setError('Vui lòng nhập Số điện thoại.');
    if (!file) return setError('Vui lòng tải lên ảnh chân dung.');
    
    // Xử lý custom outfit
    let finalOutfit = outfit;
    if (outfit === "Tùy chọn khác...") {
      if (!customOutfit.trim()) return setError('Vui lòng nhập mô tả trang phục mong muốn.');
      finalOutfit = customOutfit.trim();
    }

    setLoading(true);

    try {
      // Dùng FormData để gửi multipart/form-data
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('job', job.trim()); // Có thể rỗng
      formData.append('phone', phone.replace(/\s/g, ''));
      formData.append('face', file);
      formData.append('outfit', finalOutfit);
      formData.append('portraitStyle', portraitStyle);

      const response = await fetch('/.netlify/functions/generate', {
        method: 'POST',
        body: formData, // Fetch tự động set Content-Type là multipart/form-data
      });

      let data: GenerateResponse;
      try {
        data = await response.json();
      } catch (e) {
        throw new Error("Phản hồi máy chủ không hợp lệ.");
      }

      if (!response.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra khi tạo ảnh.');
      }

      const finalImage = data.image_base64 
        ? `data:image/png;base64,${data.image_base64}` 
        : data.image_url;

      if (!finalImage) throw new Error("Không nhận được ảnh từ AI.");

      setResultImage(finalImage);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Lỗi kết nối đến máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (resultImage) {
      const link = document.createElement('a');
      link.href = resultImage;
      link.download = `bang-chuc-danh-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1614] text-amber-50 font-sans selection:bg-amber-900 selection:text-white">
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        
        {/* Header */}
        <header className="mb-10 text-center">
          <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent mb-3 tracking-tight">
            Cao Trang AI
          </h1>
          <p className="text-amber-200/60 text-lg uppercase tracking-widest text-sm">
            Kiến Tạo Biển Chức Danh Cao Cấp
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Cột Trái: Form */}
          <div className="lg:col-span-5 bg-[#26211e] border border-amber-900/30 p-6 md:p-8 rounded-sm shadow-2xl relative overflow-hidden">
            {/* Decoration line */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-600 to-transparent opacity-50"></div>

            <div className="flex items-center gap-2 mb-6 border-b border-amber-900/30 pb-4">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h2 className="text-xl font-bold text-amber-100 uppercase tracking-wide">Thông Tin Lãnh Đạo</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Ảnh chân dung */}
              <div className="mb-6">
                <label className="block text-xs font-semibold text-amber-500 uppercase tracking-wider mb-2">
                  Ảnh Chân Dung Tham Khảo <span className="text-red-500">*</span>
                </label>
                <div 
                  className={`relative group border border-dashed rounded-sm p-6 text-center cursor-pointer transition-all duration-300 
                    ${file 
                      ? 'border-amber-500/50 bg-amber-900/10' 
                      : 'border-amber-800/40 hover:border-amber-500/50 hover:bg-amber-900/5'
                    }`}
                  onClick={() => !loading && fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                    accept="image/png, image/jpeg, image/jpg"
                    disabled={loading}
                  />
                  
                  {preview ? (
                    <div className="relative w-32 h-40 mx-auto overflow-hidden shadow-lg border border-amber-500/30 bg-black">
                      <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-all flex items-center justify-center">
                        <span className="text-xs text-white opacity-0 group-hover:opacity-100 bg-black/60 px-2 py-1 rounded">Đổi ảnh</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-2">
                      <div className="w-12 h-12 rounded-full bg-amber-900/20 flex items-center justify-center mb-3 text-amber-600 group-hover:text-amber-400 transition-colors">
                        <Upload className="w-6 h-6" />
                      </div>
                      <span className="text-sm text-amber-200/80 font-medium">Tải ảnh lên (JPG/PNG)</span>
                      <span className="text-xs text-amber-500/40 mt-1">Khuyên dùng: Ảnh chính diện, rõ nét</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tên & Ngành nghề */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-amber-500 uppercase tracking-wider mb-1">
                    <User className="w-3 h-3" /> Họ và Tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#1e1b19] border border-amber-900/50 text-amber-100 px-4 py-3 rounded-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition placeholder-amber-800/50"
                    placeholder="VD: Nguyễn Văn A"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-amber-500 uppercase tracking-wider mb-1">
                    <Briefcase className="w-3 h-3" /> Chức danh / Ngành nghề
                  </label>
                  <input
                    type="text"
                    value={job}
                    onChange={(e) => setJob(e.target.value)}
                    className="w-full bg-[#1e1b19] border border-amber-900/50 text-amber-100 px-4 py-3 rounded-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition placeholder-amber-800/50"
                    placeholder="VD: Giám Đốc Điều Hành (Để trống nếu muốn)"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Số điện thoại */}
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-amber-500 uppercase tracking-wider mb-1">
                  <Phone className="w-3 h-3" /> Số điện thoại <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  className="w-full bg-[#1e1b19] border border-amber-900/50 text-amber-100 px-4 py-3 rounded-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition placeholder-amber-800/50 font-mono"
                  placeholder="09xx xxx xxx"
                  disabled={loading}
                />
              </div>

              {/* Trang phục & Phong cách */}
              <div className="grid grid-cols-1 gap-4 pt-2">
                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-amber-500 uppercase tracking-wider mb-1">
                    <Shirt className="w-3 h-3" /> Trang phục
                  </label>
                  <select
                    value={outfit}
                    onChange={(e) => setOutfit(e.target.value)}
                    className="w-full bg-[#1e1b19] border border-amber-900/50 text-amber-100 px-4 py-3 rounded-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition appearance-none cursor-pointer"
                    disabled={loading}
                  >
                    {OUTFIT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  {outfit === "Tùy chọn khác..." && (
                    <input
                      type="text"
                      value={customOutfit}
                      onChange={(e) => setCustomOutfit(e.target.value)}
                      className="mt-2 w-full bg-[#1e1b19] border border-amber-900/50 text-amber-100 px-4 py-2 rounded-sm focus:border-amber-500 outline-none text-sm placeholder-amber-800/50 animate-fade-in"
                      placeholder="Mô tả trang phục bạn muốn..."
                      disabled={loading}
                    />
                  )}
                </div>

                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-amber-500 uppercase tracking-wider mb-1">
                    <Palette className="w-3 h-3" /> Phong cách chân dung
                  </label>
                  <select
                    value={portraitStyle}
                    onChange={(e) => setPortraitStyle(e.target.value)}
                    className="w-full bg-[#1e1b19] border border-amber-900/50 text-amber-100 px-4 py-3 rounded-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition appearance-none cursor-pointer"
                    disabled={loading}
                  >
                    {STYLE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Error & Button */}
              <div className="pt-4">
                {error && (
                  <div className="mb-4 bg-red-900/20 text-red-400 p-3 rounded-sm text-sm border border-red-900/50 text-center">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-4 px-6 rounded-sm font-bold text-black uppercase tracking-widest shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all transform hover:-translate-y-0.5
                    ${loading 
                      ? 'bg-amber-800/50 text-amber-500/50 cursor-not-allowed shadow-none' 
                      : 'bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 active:scale-[0.99]'
                    }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Đang Chế Tác...
                    </span>
                  ) : (
                    'Tạo Tác Phẩm'
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Cột Phải: Preview */}
          <div className="lg:col-span-7 h-full">
            <div className="bg-[#26211e] border border-amber-900/30 p-2 rounded-sm shadow-2xl h-full min-h-[600px] flex flex-col relative">
               {/* Corner Accents */}
               <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-amber-600"></div>
               <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-amber-600"></div>
               <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-amber-600"></div>
               <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-amber-600"></div>

              {resultImage ? (
                <div className="flex-1 flex flex-col p-4 animate-fade-in">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-amber-500 text-xs font-bold uppercase tracking-widest">Tác phẩm hoàn thiện</span>
                    <span className="text-amber-700 text-xs">AI Luxury Generator</span>
                  </div>
                  
                  <div className="relative flex-1 rounded-sm overflow-hidden shadow-black/50 shadow-2xl border border-amber-900/50 bg-black group">
                    <img src={resultImage} alt="Kết quả" className="w-full h-full object-contain" />
                  </div>

                  <div className="mt-6 flex justify-center">
                    <button 
                      onClick={handleDownload}
                      className="flex items-center gap-2 bg-amber-900/40 border border-amber-500/50 text-amber-400 py-3 px-8 hover:bg-amber-500 hover:text-black transition-all font-bold uppercase tracking-wider text-sm rounded-sm"
                    >
                      <Download className="w-5 h-5" /> Tải Xuống Bản Gốc
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-60">
                  {loading ? (
                    <div className="space-y-6">
                      <div className="relative w-24 h-24 mx-auto">
                        <div className="absolute inset-0 border-t-2 border-amber-500 rounded-full animate-spin"></div>
                        <div className="absolute inset-2 border-r-2 border-amber-700 rounded-full animate-spin reverse"></div>
                      </div>
                      <div>
                        <h3 className="text-amber-400 text-xl font-light mb-2">Đang Chạm Khắc Kỹ Thuật Số</h3>
                        <p className="text-amber-700 text-sm">AI đang phân tích gương mặt & tạo hình 3D...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="w-20 h-20 bg-amber-900/20 rounded-full flex items-center justify-center mx-auto border border-amber-900/30">
                        <ImageIcon className="w-10 h-10 text-amber-800" />
                      </div>
                      <h3 className="text-amber-500/50 text-lg uppercase tracking-widest font-bold">Sẵn Sàng Chế Tác</h3>
                      <p className="text-amber-800 text-sm max-w-xs mx-auto">
                        Điền thông tin và tải ảnh để khởi tạo bảng danh vị độc bản.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;