import React, { useState, useEffect, useRef, useCallback } from 'react';
import { type StoryPage } from './types';
import { startChatSession, generateStoryText, generateImage, textToSpeech } from './services/geminiService';
import LoadingSpinner from './components/LoadingSpinner';
import { NextIcon, PrevIcon, ReplayIcon } from './components/IconComponents';
import { type Chat } from '@google/genai';

const availableVoices = [
  { id: 'Kore', name: 'Gentle Storyteller' },
  { id: 'Puck', name: 'Playful Pixie' },
  { id: 'Charon', name: 'Wise Old Sage' },
  { id: 'Fenrir', name: 'Brave Knight' },
  { id: 'Zephyr', name: 'Cheerful Friend' },
];

const App: React.FC = () => {
  const [initialPrompt, setInitialPrompt] = useState<string>('');
  const [storyStarted, setStoryStarted] = useState<boolean>(false);
  const [storyPages, setStoryPages] = useState<StoryPage[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<string>('Kore');

  const chatSessionRef = useRef<Chat | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    // FIX: Cast `window` to `any` to allow checking for `webkitAudioContext` without TypeScript errors.
    if (window.AudioContext || (window as any).webkitAudioContext) {
      if (!audioContextRef.current) {
        // FIX: Cast `window` to `any` to allow instantiating `webkitAudioContext` without TypeScript errors.
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    } else {
      setError("Your browser does not support the Web Audio API, which is needed for this app.");
    }
  }, []);

  const playAudio = useCallback((audioBuffer: AudioBuffer | null) => {
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
    }
    if (audioBuffer && audioContextRef.current) {
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();
      audioSourceRef.current = source;
    }
  }, []);

  useEffect(() => {
    if (storyPages.length > 0 && storyPages[currentPageIndex]) {
      playAudio(storyPages[currentPageIndex].audio);
    }
  }, [currentPageIndex, storyPages, playAudio]);
  
  const generateNewPage = async (prompt: string, isFirstPage: boolean) => {
    setIsLoading(true);
    setError(null);
    if (!chatSessionRef.current) {
      setIsLoading(false);
      return;
    }
  
    // 1. Generate Story Text (critical failure)
    let text;
    try {
      text = await generateStoryText(chatSessionRef.current, prompt);
    } catch (e) {
      console.error("Story text generation failed:", e);
      setError("Oops! The storyteller got writer's block. Please try starting a new story.");
      setStoryStarted(false); // Reset on critical failure
      setIsLoading(false);
      return;
    }
  
    // We have text, so create the page and show it immediately
    const newPage: StoryPage = {
      id: Date.now().toString(),
      text,
      image: null,
      audio: null,
    };
  
    if (isFirstPage) {
      setStoryPages([newPage]);
      setCurrentPageIndex(0);
    } else {
      setStoryPages(prev => [...prev, newPage]);
      setCurrentPageIndex(prev => prev + 1);
    }
  
    // 2. Generate Image and Audio (non-critical enhancements)
    const generationErrors: string[] = [];
  
    const imagePromise = generateImage(text);
    const audioPromise = audioContextRef.current ? textToSpeech(text, audioContextRef.current, selectedVoice) : Promise.resolve(null);
  
    const [imageResult, audioResult] = await Promise.allSettled([imagePromise, audioPromise]);
  
    let finalImageUrl: string | null = null;
    if (imageResult.status === 'fulfilled') {
      finalImageUrl = imageResult.value;
    } else {
      console.error("Image generation failed:", imageResult.reason);
      generationErrors.push("The magic paintbrush is out of ink, so we couldn't draw a picture.");
    }
  
    let finalAudioBuffer: AudioBuffer | null = null;
    if (audioResult.status === 'fulfilled' && audioResult.value) {
      finalAudioBuffer = audioResult.value;
    } else if (audioResult.status === 'rejected') {
      console.error("TTS generation failed:", audioResult.reason);
      generationErrors.push("The storyteller lost their voice and couldn't read this page aloud.");
    }
  
    // Update page with whatever was successful
    setStoryPages(prev =>
      prev.map(p => p.id === newPage.id ? { ...p, image: finalImageUrl, audio: finalAudioBuffer } : p)
    );
  
    if (generationErrors.length > 0) {
      setError(generationErrors.join(' '));
    }
  
    setIsLoading(false);
  };


  const handleStartStory = async () => {
    if (!initialPrompt.trim()) return;
    chatSessionRef.current = startChatSession(initialPrompt);
    setStoryStarted(true);
    await generateNewPage("Let's begin!", true);
  };
  
  const handleNextPage = () => {
    if (isLoading) return;
    if (currentPageIndex < storyPages.length - 1) {
      setCurrentPageIndex(prev => prev + 1);
    } else {
      generateNewPage("What magical thing happens next? Tell me the next part of the story. Keep it very short and simple.", false);
    }
  };

  const handlePrevPage = () => {
    if (isLoading || currentPageIndex <= 0) return;
    setCurrentPageIndex(prev => prev - 1);
  };

  const currentPage = storyPages[currentPageIndex];

  const renderInitialView = () => (
    <div className="w-full max-w-lg mx-auto text-center">
      <h2 className="text-4xl font-bold text-rose-800 mb-4" style={{ fontFamily: "'Comic Sans MS', cursive" }}>What's our story about?</h2>
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          value={initialPrompt}
          onChange={(e) => setInitialPrompt(e.target.value)}
          placeholder="A dragon who loves baking..."
          className="flex-grow p-4 rounded-xl border-4 border-rose-300 focus:ring-4 focus:ring-rose-400 focus:border-rose-400 transition duration-300 text-lg"
          onKeyDown={(e) => e.key === 'Enter' && handleStartStory()}
        />
        <button
          onClick={handleStartStory}
          disabled={isLoading || !initialPrompt.trim()}
          className="px-8 py-4 bg-rose-500 text-white font-bold rounded-xl text-lg shadow-lg hover:bg-rose-600 transition-transform transform hover:scale-105 disabled:bg-rose-300 disabled:scale-100"
        >
          Start Story
        </button>
      </div>
      <div className="mt-6">
        <label htmlFor="voice-select" className="text-xl font-semibold text-rose-700 mr-3">Storyteller's Voice:</label>
        <select
          id="voice-select"
          value={selectedVoice}
          onChange={(e) => setSelectedVoice(e.target.value)}
          className="p-3 rounded-xl border-4 border-rose-300 bg-white text-lg focus:ring-4 focus:ring-rose-400 focus:border-rose-400 transition duration-300"
          style={{ fontFamily: "'Comic Sans MS', cursive" }}
        >
          {availableVoices.map(voice => (
            <option key={voice.id} value={voice.id}>{voice.name}</option>
          ))}
        </select>
      </div>
    </div>
  );

  const renderStoryView = () => {
    if (!currentPage && isLoading) {
      return (
        <div className="text-center">
            <LoadingSpinner />
            <p className="mt-4 text-xl text-rose-700 font-semibold">Our story is beginning...</p>
        </div>
      );
    }
    
    if (!currentPage) return null;

    return (
      <div className="flex flex-col h-full w-full">
        <div
          key={currentPage.id}
          className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-8 items-center animate-fade-in-slide-up"
        >
          <div className="w-full aspect-square bg-rose-100 rounded-3xl shadow-lg flex items-center justify-center p-4 border-4 border-rose-200">
            {currentPage.image ? (
              <img src={currentPage.image} alt="Story illustration" className="object-cover w-full h-full rounded-2xl" />
            ) : (
              <div className="flex flex-col items-center text-rose-500">
                <LoadingSpinner/>
                <p className="mt-2 font-semibold">Drawing the picture...</p>
              </div>
            )}
          </div>
          <div className="h-full bg-white/50 backdrop-blur-sm p-8 rounded-3xl shadow-lg border-4 border-white">
            <p className="text-2xl md:text-3xl leading-relaxed text-gray-800" style={{ fontFamily: "'Comic Sans MS', cursive" }}>
              {currentPage.text || <span className="animate-pulse">Thinking of what happens next...</span>}
            </p>
          </div>
        </div>
        
        <div className="flex-shrink-0 mt-8 flex justify-center items-center gap-4">
            <button onClick={handlePrevPage} disabled={isLoading || currentPageIndex === 0} className="p-4 bg-white rounded-full shadow-md disabled:opacity-40 hover:bg-rose-100 transition">
                <PrevIcon className="h-8 w-8 text-rose-500" />
            </button>
            <button onClick={() => playAudio(currentPage.audio)} disabled={!currentPage.audio} className="p-4 bg-white rounded-full shadow-md disabled:opacity-40 hover:bg-rose-100 transition">
                <ReplayIcon className="h-8 w-8 text-rose-500" />
            </button>
            <button onClick={handleNextPage} disabled={isLoading} className="p-4 bg-white rounded-full shadow-md disabled:opacity-40 hover:bg-rose-100 transition">
                {isLoading && currentPageIndex === storyPages.length - 1 ? <LoadingSpinner/> : <NextIcon className="h-8 w-8 text-rose-500" />}
            </button>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-amber-50 flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-cover bg-center opacity-20" style={{backgroundImage: "url('https://www.transparenttextures.com/patterns/notebook.png')"}}></div>
        <div className="z-10 w-full max-w-6xl">
            <h1 className="text-5xl md:text-6xl font-extrabold text-center mb-8 text-rose-800" style={{ fontFamily: "'Comic Sans MS', cursive" }}>
                Story Weaver AI
            </h1>
            {error && <div className="bg-red-200 text-red-800 p-4 rounded-xl mb-4 text-center">{error}</div>}
            
            <div className="w-full h-full flex items-center justify-center">
                {!storyStarted ? renderInitialView() : renderStoryView()}
            </div>
        </div>
    </main>
  );
};

export default App;