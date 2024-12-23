import { useEffect, useRef, useCallback, useState } from 'react';
import { RealtimeClient } from '@openai/realtime-api-beta';
import { ItemType } from '@openai/realtime-api-beta/dist/lib/client.js';
import { WavRecorder, WavStreamPlayer } from '../lib/wavtools/index.js';
import { WavRenderer } from '../utils/wav_renderer';
import { Button } from '../components/button/Button';
import { STORY_INSTRUCTIONS, VOICE_CONFIGS } from '../utils/story_config';
import { loadStoryContent, parseStoryMd } from '../utils/file_utils';
import { Logger } from '../utils/logger';  // We'll create this

import './ConsolePage.scss';

const LOCAL_RELAY_SERVER_URL: string = process.env.REACT_APP_LOCAL_RELAY_SERVER_URL || '';

interface RealtimeEvent {
  time: string;
  source: 'client' | 'server';
  count?: number;
  event: { [key: string]: any };
}

export function StoryConsolePage() {
  const logger = useRef<Logger>(new Logger('story-events'));

  const apiKey = LOCAL_RELAY_SERVER_URL
    ? ''
    : localStorage.getItem('tmp::voice_api_key') ||
      prompt('OpenAI API Key') ||
      '';
  if (apiKey !== '') {
    localStorage.setItem('tmp::voice_api_key', apiKey);
  }

  // Core refs for audio and client
  const wavRecorderRef = useRef<WavRecorder>(
    new WavRecorder({ sampleRate: 24000 })
  );
  const wavStreamPlayerRef = useRef<WavStreamPlayer>(
    new WavStreamPlayer({ sampleRate: 24000 })
  );
  const clientRef = useRef<RealtimeClient>(
    new RealtimeClient(
      LOCAL_RELAY_SERVER_URL
        ? { url: LOCAL_RELAY_SERVER_URL }
        : {
            apiKey: apiKey,
            dangerouslyAllowAPIKeyInBrowser: true,
          }
    )
  );

  // Canvas refs for visualization
  const clientCanvasRef = useRef<HTMLCanvasElement>(null);
  const serverCanvasRef = useRef<HTMLCanvasElement>(null);
  const eventsScrollRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<string>(new Date().toISOString());

  // State management
  const [items, setItems] = useState<ItemType[]>([]);
  const [realtimeEvents, setRealtimeEvents] = useState<RealtimeEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Initialize story session
  const connectStory = useCallback(async () => {
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;

    // Load initial story content
    const storyContent = await loadStoryContent('scene1_story.md');
    const scene = parseStoryMd(storyContent);
    const initialNarration = scene.elements.find(e => e.type === 'narrate')?.content;
    const chefBaoElement = scene.elements.find(e => e.type === 'speak' && e.character === 'chef_bao');

    startTimeRef.current = new Date().toISOString();
    setIsConnected(true);
    setRealtimeEvents([]);
    setItems(client.conversation.getItems());

    // Connect audio components
    await wavRecorder.begin();
    await wavStreamPlayer.connect();
    await client.connect();

    // Send initial story context
    client.sendUserMessageContent([
      {
        type: 'input_text',
        text: `${STORY_INSTRUCTIONS}\n[SYSTEM] Initial narration: "${initialNarration}"\nPlease begin by narrating exactly the provided initial narration text.`,
      },
    ]);

  
    client.updateSession({ voice: VOICE_CONFIGS.chef_bao });
    client.sendUserMessageContent([
      {
        type: 'input_text',
        text: `[SYSTEM] Please read this line with ${chefBaoElement?.emotion} emotion: "${chefBaoElement?.content}"`,
      },
    ]);  

    // Start story
    client.sendUserMessageContent([
      {
        type: 'input_text',
        text: `Let's begin our story adventure!`,
      },
    ]);
  }, []);

  // Cleanup and disconnect
  const disconnectStory = useCallback(async () => {
    setIsConnected(false);
    setRealtimeEvents([]);
    setItems([]);

    const client = clientRef.current;
    client.disconnect();

    const wavRecorder = wavRecorderRef.current;
    await wavRecorder.end();

    const wavStreamPlayer = wavStreamPlayerRef.current;
    await wavStreamPlayer.interrupt();
  }, []);

  // Audio visualization
  useEffect(() => {
    let isLoaded = true;

    const wavRecorder = wavRecorderRef.current;
    const clientCanvas = clientCanvasRef.current;
    let clientCtx: CanvasRenderingContext2D | null = null;

    const wavStreamPlayer = wavStreamPlayerRef.current;
    const serverCanvas = serverCanvasRef.current;
    let serverCtx: CanvasRenderingContext2D | null = null;

    const render = () => {
      if (isLoaded) {
        if (clientCanvas) {
          if (!clientCanvas.width || !clientCanvas.height) {
            clientCanvas.width = clientCanvas.offsetWidth;
            clientCanvas.height = clientCanvas.offsetHeight;
          }
          clientCtx = clientCtx || clientCanvas.getContext('2d');
          if (clientCtx) {
            clientCtx.clearRect(0, 0, clientCanvas.width, clientCanvas.height);
            const result = wavRecorder.recording
              ? wavRecorder.getFrequencies('voice')
              : { values: new Float32Array([0]) };
            WavRenderer.drawBars(
              clientCanvas,
              clientCtx,
              result.values,
              '#0099ff',
              10,
              0,
              8
            );
          }
        }
        if (serverCanvas) {
          if (!serverCanvas.width || !serverCanvas.height) {
            serverCanvas.width = serverCanvas.offsetWidth;
            serverCanvas.height = serverCanvas.offsetHeight;
          }
          serverCtx = serverCtx || serverCanvas.getContext('2d');
          if (serverCtx) {
            serverCtx.clearRect(0, 0, serverCanvas.width, serverCanvas.height);
            const result = wavStreamPlayer.analyser
              ? wavStreamPlayer.getFrequencies('voice')
              : { values: new Float32Array([0]) };
            WavRenderer.drawBars(
              serverCanvas,
              serverCtx,
              result.values,
              '#009900',
              10,
              0,
              8
            );
          }
        }
        window.requestAnimationFrame(render);
      }
    };
    render();

    return () => {
      isLoaded = false;
    };
  }, []);

  // Core setup and event handlers
  useEffect(() => {
    const wavStreamPlayer = wavStreamPlayerRef.current;
    const client = clientRef.current;

    // Set up audio transcription
    client.updateSession({ input_audio_transcription: { model: 'whisper-1' } });
    logger.current.log('session.update', { input_audio_transcription: { model: 'whisper-1' } });

    // Handle realtime events
    client.on('realtime.event', (realtimeEvent: RealtimeEvent) => {
      logger.current.log('realtime.event', realtimeEvent);
      setRealtimeEvents((realtimeEvents) => {
        const lastEvent = realtimeEvents[realtimeEvents.length - 1];
        if (lastEvent?.event.type === realtimeEvent.event.type) {
          lastEvent.count = (lastEvent.count || 0) + 1;
          return realtimeEvents.slice(0, -1).concat(lastEvent);
        } else {
          return realtimeEvents.concat(realtimeEvent);
        }
      });
    });

    // Handle errors
    client.on('error', (event: any) => {
      logger.current.error('client.error', event);
      console.error(event);
    });

    // Handle interruptions
    client.on('conversation.interrupted', async () => {
      logger.current.log('conversation.interrupted');
      const trackSampleOffset = await wavStreamPlayer.interrupt();
      if (trackSampleOffset?.trackId) {
        const { trackId, offset } = trackSampleOffset;
        await client.cancelResponse(trackId, offset);
        logger.current.log('conversation.cancelled', { trackId, offset });
      }
    });    // Handle conversation updates and audio playback
    client.on('conversation.updated', async ({ item, delta }: any) => {
      logger.current.log('conversation.updated', { itemId: item.id, delta: delta ? 'present' : 'absent' });
      
      const items = client.conversation.getItems();
      if (delta?.audio) {
        wavStreamPlayer.add16BitPCM(delta.audio, item.id);
        logger.current.log('audio.added', { itemId: item.id });
      }
      
      if (item.status === 'completed' && item.formatted.audio?.length) {
        logger.current.log('audio.completed', { itemId: item.id });
        const wavFile = await WavRecorder.decode(
          item.formatted.audio,
          24000,
          24000
        );
        item.formatted.file = wavFile;
        logger.current.log('audio.decoded', { itemId: item.id });
      }
      setItems(items);
    });

    setItems(client.conversation.getItems());

    return () => {
      logger.current.log('cleanup', 'client reset');
      client.reset();
    };
  }, []);

  return (
    <div className="console-page">
      <div className="story-controls">
        <Button
          onClick={isConnected ? disconnectStory : connectStory}
          className={isConnected ? 'connected' : ''}
          label={isConnected ? 'Stop Story' : 'Start Story'}
        >
          {isConnected ? 'Stop Story' : 'Start Story'}
        </Button>
        <Button 
          onClick={() => logger.current?.downloadLogs()}
          label="Download Logs"  // Add label prop
        >
          Download Logs
        </Button>
      </div>
      
      <div className="visualization">
        <canvas ref={clientCanvasRef} className="audio-viz" />
        <canvas ref={serverCanvasRef} className="audio-viz" />
      </div>

      <div className="conversation-display">
        {items.map((item, i) => (
          <div key={item.id} className={`conversation-item ${item.role}`}>
            <div className="content">
              {item.formatted.transcript || item.formatted.text}
              {item.formatted.file && (
                <audio src={item.formatted.file.url} controls />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}