
import React, { useState } from 'react';

interface UploadModalProps {
  onUpload: (videoFile: File) => void;
  onClose: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ onUpload, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (file) {
      onUpload(file);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-6 backdrop-blur-md">
      <div className="bg-zinc-900 w-full max-w-sm rounded-[3rem] p-8 relative border border-white/10 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mb-10">
          <h2 className="text-2xl font-black tracking-tight mb-2">Nuevo Video</h2>
          <p className="text-zinc-500 text-sm">Sin títulos, sin presión. Solo tú.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-700 rounded-[2.5rem] p-4 hover:border-blue-500 transition-all cursor-pointer relative overflow-hidden h-72 bg-zinc-800/30">
            {preview ? (
              <video src={preview} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="text-center">
                <div className="bg-blue-600/20 p-5 rounded-full mb-4 mx-auto w-fit">
                  <svg className="w-10 h-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <p className="text-xs text-zinc-400 font-black uppercase tracking-widest">Seleccionar Archivo</p>
              </div>
            )}
            <input
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>

          <button
            type="submit"
            disabled={!file}
            className={`w-full py-6 rounded-2xl font-black transition-all text-lg shadow-xl ${file
                ? 'bg-white text-black hover:scale-105 active:scale-95'
                : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              }`}
          >
            SOLTAR VIDEO
          </button>
        </form>
      </div>
    </div>
  );
};
