import React, { useState } from 'react';
import { CameraRecorder } from './CameraRecorder';

interface UploadModalProps {
  onUpload: (videoFile: File, caption: string) => void;
  onClose: () => void;
}

type Step = 'SELECT' | 'RECORD' | 'FINALIZE';

export const UploadModal: React.FC<UploadModalProps> = ({ onUpload, onClose }) => {
  const [step, setStep] = useState<Step>('SELECT');
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [caption, setCaption] = useState('');
  const [fileSizeStr, setFileSizeStr] = useState<string>('');
  const [isLargeFile, setIsLargeFile] = useState(false);

  const videoPreviewUrl = React.useMemo(() => {
    if (!videoBlob) return '';
    return URL.createObjectURL(videoBlob);
  }, [videoBlob]);

  React.useEffect(() => {
    return () => {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    };
  }, [videoPreviewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      const sizeMB = file.size / (1024 * 1024);
      setFileSizeStr(`${sizeMB.toFixed(1)} MB`);
      setIsLargeFile(sizeMB > 15);

      if (file.size > 200 * 1024 * 1024) {
        alert('El archivo es demasiado grande. Máximo 200MB.');
        return;
      }

      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        if (video.duration > 125) {
          alert('El video no puede durar más de 2 minutos.');
        } else {
          setVideoBlob(file);
          setStep('FINALIZE');
        }
      };
      video.src = URL.createObjectURL(file);
    }
  };

  const handleCapture = (blob: Blob) => {
    setVideoBlob(blob);
    setStep('FINALIZE');
  };

  const handleSubmit = () => {
    if (videoBlob) {
      const file = videoBlob instanceof File
        ? videoBlob
        : new File([videoBlob], `video_${Date.now()}.webm`, { type: 'video/webm' });
      onUpload(file, caption);
    }
  };

  if (step === 'RECORD') {
    return <CameraRecorder onCapture={handleCapture} onCancel={() => setStep('SELECT')} />;
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 p-6 backdrop-blur-md">
      <div className="bg-zinc-900 w-full max-w-sm rounded-[3rem] p-8 relative border border-white/10 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto hide-scrollbar">
        <button
          onClick={onClose}
          className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors z-20"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {step === 'SELECT' ? (
          <>
            <div className="text-center mb-10">
              <h2 className="text-2xl font-black tracking-tight mb-2 uppercase italic tracking-tighter">ZENTOK CREAR</h2>
              <p className="text-zinc-500 text-sm">Videos de hasta 2 minutos.</p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => setStep('RECORD')}
                className="w-full flex items-center justify-between p-6 bg-white text-black rounded-[2rem] font-black hover:scale-[1.02] transition-all group"
              >
                <div className="flex items-center space-x-4">
                  <div className="bg-red-500 p-3 rounded-2xl text-white group-hover:rotate-12 transition-transform shadow-lg shadow-red-500/20">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z" /></svg>
                  </div>
                  <span className="text-lg uppercase italic tracking-tighter">Grabar ahora</span>
                </div>
                <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
              </button>

              <div className="relative">
                <button
                  className="w-full flex items-center justify-between p-6 bg-zinc-800 text-white rounded-[2rem] font-black hover:bg-zinc-700 transition-all border border-white/5"
                >
                  <div className="flex items-center space-x-4">
                    <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-600/20">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    </div>
                    <span className="text-lg uppercase italic tracking-tighter">Subir archivo</span>
                  </div>
                </button>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <div className="text-center mb-2">
              <h2 className="text-2xl font-black tracking-tight uppercase italic tracking-tighter">Finalizar Video</h2>
            </div>

            <div className="aspect-[9/16] bg-black rounded-[2rem] overflow-hidden relative border border-white/10 shadow-2xl">
              <video
                src={videoPreviewUrl}
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Pie de foto</label>
                {fileSizeStr && (
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isLargeFile ? 'bg-orange-500/10 text-orange-500' : 'bg-green-500/10 text-green-500'}`}>
                    {fileSizeStr}
                  </span>
                )}
              </div>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="¿De qué trata tu video?..."
                className="w-full bg-zinc-800 border-none rounded-2xl py-4 px-6 text-white text-sm focus:ring-2 focus:ring-yellow-400 transition-all outline-none"
              />

              {isLargeFile && (
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 flex items-start space-x-3">
                  <svg className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-[11px] text-orange-200/80 leading-relaxed font-medium">
                    <span className="text-orange-400 font-bold block mb-1">Archivo pesado detectado</span>
                    Este video tardará en subirse debido a su alta calidad. Te recomendamos usar la <span className="text-white font-bold italic underline cursor-pointer" onClick={() => setStep('RECORD')}>Cámara Zen</span> para subidas instantáneas.
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={handleSubmit}
              className="w-full py-5 bg-white text-black rounded-[1.5rem] font-black hover:scale-[1.03] active:scale-95 transition-all text-xl shadow-xl uppercase italic tracking-tighter"
            >
              Publicar ahora
            </button>
            <button
              onClick={() => { setVideoBlob(null); setStep('SELECT'); }}
              className="w-full py-2 text-zinc-500 font-bold text-xs uppercase tracking-widest hover:text-white transition-colors"
            >
              Cambiar video
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
