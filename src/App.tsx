import React, { useState, useEffect, useRef } from 'react';
import { Upload, Download, RefreshCw, Loader2, Image as ImageIcon, History } from 'lucide-react';
import { HistoryItem, GenerateResponse } from './types';

const App: React.FC = () => {
  // State
  const [name, setName] = useState('');
  const [job, setJob] = useState('');
  const [phone, setPhone] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('nameplate_history');
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Lỗi đọc lịch sử:", e);
    }
  }, []);

  // Save history
  const saveToHistory = (imageUrl: string, userName: string) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      url: imageUrl,
      timestamp: Date.now(),
      name: userName
    };
    
    const newHistory = [newItem, ...history].slice(0, 5);
    setHistory(newHistory);
    localStorage.setItem('nameplate_history', JSON.stringify(newHistory));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Basic validation
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
    // Allow numbers and spaces only
    if (/^[0-9\s]*$/.test(value)) {
      setPhone(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResultImage(null);

    // Validation
    if (!name.trim()) return setError('Vui lòng nhập họ tên.');
    if (!job.trim()) return setError('Vui lòng nhập ngành nghề.');
    if (!phone.trim()) return setError('Vui lòng nhập số điện thoại.');
    if (!file) return setError('Vui lòng tải lên ảnh chân dung.');

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('job', job.trim());
      formData.append('phone', phone.replace(/\s/g, '')); // Normalize phone
      formData.append('face', file);

      const response = await fetch('/.netlify/functions/generate', {
        method: 'POST',
        body: formData,
      });

      const data: GenerateResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra khi tạo ảnh.');
      }

      const finalImage = data.image_base64 
        ? `data:image/png;base64,${data.image_base64}` 
        : data.image_url;

      if (!finalImage) throw new Error("Không nhận được dữ liệu ảnh từ server.");

      setResultImage(finalImage);
      saveToHistory(finalImage, name);

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

  const handleReset = () => {
    setResultImage(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 font-sans text-slate-800">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-wood-900 mb-2">
            Tạo Bảng Chức Danh Cao Cấp
          </h1>
          <p className="text-gray-600">
            Công nghệ AI giúp bạn sở hữu bảng tên sang trọng chỉ trong vài giây.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Column: Form */}
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <form onSubmit={handleSubmit} className="space-y-5">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Họ và Tên</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent outline-none transition"
                  placeholder="Ví dụ: Mr. Nguyễn Văn A"
                  maxLength={30}
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngành nghề / Chức vụ</label>
                <input
                  type="text"
                  value={job}
                  onChange={(e) => setJob(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent outline-none transition"
                  placeholder="Ví dụ: Giám đốc Kinh Doanh"
                  maxLength={40}
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent outline-none transition"
                  placeholder="0912 345 678"
                  maxLength={15}
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ảnh gương mặt (Tham chiếu)</label>
                <div 
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${file ? 'border-gold-500 bg-orange-50' : 'border-gray-300 hover:border-gray-400'}`}
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
                    <div className="relative w-32 h-32 mx-auto overflow-hidden rounded-full border-2 border-white shadow-md">
                      <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-4">
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">Bấm để tải ảnh lên (JPG/PNG)</span>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 px-4 rounded-lg font-bold text-white shadow-md transition-all
                  ${loading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-wood-800 to-wood-900 hover:from-wood-900 hover:to-black active:scale-[0.98]'
                  }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Đang khởi tạo...
                  </span>
                ) : (
                  'Tạo Ảnh Ngay'
                )}
              </button>
            </form>
          </div>

          {/* Right Column: Result & History */}
          <div className="space-y-6">
            
            {/* Result Area */}
            <div className={`bg-white p-6 rounded-xl shadow-lg border border-gray-200 min-h-[400px] flex flex-col justify-center items-center ${!resultImage && 'bg-gray-50'}`}>
              {resultImage ? (
                <div className="w-full space-y-4 animate-fade-in">
                  <div className="relative rounded-lg overflow-hidden shadow-2xl border border-gray-200">
                    <img src={resultImage} alt="Kết quả" className="w-full h-auto" />
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={handleDownload}
                      className="flex-1 flex items-center justify-center gap-2 bg-gold-600 text-white py-2 px-4 rounded-lg hover:bg-gold-500 font-medium transition shadow-sm"
                    >
                      <Download className="w-5 h-5" /> Tải xuống
                    </button>
                    <button 
                      onClick={handleReset}
                      className="flex items-center justify-center gap-2 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 font-medium transition"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-400">
                  {loading ? (
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 border-4 border-gold-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p className="text-gray-500 font-medium">Đang xử lý ảnh...</p>
                      <p className="text-xs text-gray-400 mt-1">Quá trình này có thể mất 10-20 giây</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <ImageIcon className="w-16 h-16 mb-2 opacity-20" />
                      <p>Kết quả sẽ hiển thị tại đây</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* History Area */}
            {history.length > 0 && (
              <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
                <h3 className="flex items-center gap-2 font-bold text-gray-700 mb-4">
                  <History className="w-5 h-5" /> Lịch sử gần nhất
                </h3>
                <div className="grid grid-cols-5 gap-2">
                  {history.map((item) => (
                    <div 
                      key={item.id} 
                      className="relative aspect-[3/4] cursor-pointer group overflow-hidden rounded-md border border-gray-100"
                      onClick={() => setResultImage(item.url)}
                    >
                      <img src={item.url} alt={item.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

export default App