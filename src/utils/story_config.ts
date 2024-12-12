// Story instructions and personality guidelines
export const STORY_INSTRUCTIONS = `System settings:
Tool use: enabled.

Instructions:
- You are an interactive storyteller for young children
- Each character has a distinct personality and voice
- Narrator: Warm and clear storytelling voice
- Chef Bao: Friendly panda chef with a gentle, encouraging tone
- Brick Buddy: Energetic Lego figure with an enthusiastic voice
- Stay in character and maintain story continuity
- React appropriately to children's responses

Personality:
- Keep language simple and child-friendly
- Be engaging and encouraging
- Maintain character consistency
`;

// Just define the session config object directly
export const STORY_SESSION = {
  modalities: ['text', 'audio'],
  voice: 'alloy' as const,
  input_audio_format: 'pcm16' as const,  // Match the audio format used in ConsolePage
  output_audio_format: 'pcm16' as const, // Match the audio format used in ConsolePage
  input_audio_transcription: { model: 'whisper-1' },
  temperature: 0.8,
  instructions: STORY_INSTRUCTIONS
};

export const VOICE_CONFIGS = {
  narrator: 'alloy',
  chef_bao: 'echo',
  brick_buddy: 'shimmer'
} as const;

export interface StoryElement {
  type: 'narrate' | 'speak' | 'input';
  character?: string;
  emotion?: string;
  content: string;
  options?: {
    text: string;
    next: string;
  }[];
  prompt?: string;
}

export interface StoryScene {
  id: string;
  ref: string;
  elements: StoryElement[];
}

// Parser for story markdown files
export function parseStoryMd(content: string): StoryScene {
  const lines = content.split('\n');
  const scene: StoryScene = {
    id: '',
    ref: '',
    elements: []
  };
  
  let currentElement: Partial<StoryElement> | null = null;
  
  for (const line of lines) {
    if (line.startsWith('@scene:')) {
      scene.id = line.replace('@scene:', '').trim();
    } else if (line.startsWith('@ref:')) {
      scene.ref = line.replace('@ref:', '').trim();
    } else if (line.startsWith('@narrate')) {
      if (currentElement) scene.elements.push(currentElement as StoryElement);
      currentElement = { type: 'narrate' };
    } else if (line.startsWith('@speak:')) {
      if (currentElement) scene.elements.push(currentElement as StoryElement);
      currentElement = {
        type: 'speak',
        character: line.replace('@speak:', '').trim()
      };
    } else if (line.startsWith('@input:')) {
      if (currentElement) scene.elements.push(currentElement as StoryElement);
      currentElement = {
        type: 'input',
        options: []
      };
    } else if (line.startsWith('[emotion:')) {
      if (currentElement) {
        currentElement.emotion = line.replace('[emotion:', '').replace(']', '').trim();
      }
    } else if (line.startsWith('[prompt:')) {
      if (currentElement) {
        currentElement.prompt = line.replace('[prompt:', '').replace(']', '').trim().replace(/"/g, '');
      }
    } else if (line.startsWith('-') && currentElement?.type === 'input') {
      const [text, next] = line.replace('-', '').trim().split('->').map(s => s.trim());
      currentElement.options = currentElement.options || [];
      currentElement.options.push({
        text: text.replace(/"/g, ''),
        next: next
      });
    } else if (line.trim() && line.trim().startsWith('"')) {
      if (currentElement) {
        currentElement.content = line.trim().replace(/"/g, '');
      }
    } else if (line.trim() && !line.startsWith('[')) {
      if (currentElement) {
        currentElement.content = line.trim();
      }
    }
  }
  
  if (currentElement) scene.elements.push(currentElement as StoryElement);
  
  return scene;
}