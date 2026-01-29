
import React, { useState } from 'react';
import { CameraRecorder } from './CameraRecorder';
import { VideoEditor } from './VideoEditor';

interface UploadModalProps {
  onUpload: (videoFile: File) => void;
  onClose: () => void;
}

type Step = 'SELECT' | 'RECORD' | 'EDIT' | 'FINALIZE';

export const UploadModal: React.FC<UploadModalProps> = ({ onUpload, onClose }) => {
  const [step, setStep] = useState<Step>('SELECT');
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [caption, setCaption] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVideoBlob(e.target.files[0]);
      setStep('EDIT');
    }
  };

  const handleCapture = (blob: Blob) => {
    setVideoBlob(blob);
    setStep('EDIT');
  };

  const handleEditorDone = (blob: Blob) => {
    setProcessedBlob(blob);
    setStep('FINALIZE');
  };

  const handleSubmit = () => {
    if (processedBlob) {
      const file = new File([processedBlob], `video_${Date.now()}.webm`, { type: 'video/webm' });
      onUpload(file);
    } else if (videoBlob) {
      const file = videoBlob instanceof File ? videoBlob : new File([videoBlob], `video_${Date.now()}.webm`, { type: 'video/webm' });
      onUpload(file);
    }
  };

  if (step === 'RECORD') {
    return <CameraRecorder onCapture={handleCapture} onCancel={() => setStep('SELECT')} />;
  }

  if (step === 'EDIT' && videoBlob) {
    return <VideoEditor videoBlob={videoBlob} onSave={handleEditorDone} onCancel={() => setStep('SELECT')} />;
  }

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

        {step === 'SELECT' ? (
          <>
            <div className="text-center mb-10">
              <h2 className="text-2xl font-black tracking-tight mb-2">Crear Nuevo</h2>
              <p className="text-zinc-500 text-sm">¿Cómo quieres empezar hoy?</p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => setStep('RECORD')}
                className="w-full flex items-center justify-between p-6 bg-white text-black rounded-3xl font-black hover:scale-[1.02] transition-all group"
              >
                <div className="flex items-center space-x-4">
                  <div className="bg-red-500 p-3 rounded-2xl text-white group-hover:rotate-12 transition-transform">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z" /></svg>
                  </div>
                  <span className="text-lg">Grabar Video</span>
                </div>
                <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
              </button>

              <div className="relative">
                <button
                  className="w-full flex items-center justify-between p-6 bg-zinc-800 text-white rounded-3xl font-black hover:bg-zinc-700 transition-all"
                >
                  <div className="flex items-center space-x-4">
                    <div className="bg-blue-600 p-3 rounded-2xl">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    </div>
                    <span className="text-lg">Subir Archivo</span>
                  </div>
                  <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
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
          <div className="space-y-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black tracking-tight mb-2">¿Listo?</h2>
              <p className="text-zinc-500 text-sm">Tu video está preparado para la comunidad.</p>
            </div>

            <div className="aspect-[9/16] bg-zinc-800 rounded-[2rem] overflow-hidden relative border border-white/5">
              <video
                src={URL.createObjectURL(processedBlob || videoBlob!)}
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                <span className="text-white font-bold text-xs uppercase tracking-widest bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">Vista Previa</span>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              className="w-full py-6 bg-white text-black rounded-2xl font-black hover:scale-105 active:scale-95 transition-all text-xl shadow-xl uppercase tracking-tighter"
            >
              Publicar Ahora
            </button>
            <button
              onClick={() => setStep('SELECT')}
              className="w-full py-2 text-zinc-500 font-bold text-xs uppercase tracking-widest hover:text-white transition-colors"
            >
              Empezar de nuevo
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
